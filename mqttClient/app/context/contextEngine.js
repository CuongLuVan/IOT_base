/**
 * Ngữ cảnh (automation) chạy trong mqttClient: khi điều kiện
 * trên "thiết bị cài đặt" (source) chuyển từ sai sang đúng, gửi lệnh bật/tắt
 * tới "thiết bị đích" (target). Module này chỉ có logic, không đụng SQL/MQTT
 * (contextService.js nối vào), nên chạy và test được độc lập.
 *
 * Ngữ cảnh: { id, sourceDeviceId, targetDeviceId, content, state, action,
 *             enabled, priority, cooldownS, timeoutS, retry }
 *   content 1 AND: mọi cổng trong state đang bật      ((port & state) == state)
 *           2 OR : ít nhất một cổng trong state bật   ((port & state) > 0)
 *           3 NOT: không cổng nào trong state bật     ((port & state) == 0)
 *           4 XOR: số cổng bật trong state là lẻ      (2 cổng: đúng một cổng bật)
 *           5..8 : cảm biến 1..4 > state
 *           9..12: cảm biến 1..4 < state
 *   Cảm biến N = giá trị thứ N của "va" (cùng đơn vị thiết bị gửi, vd nhiệt độ x100).
 *   action: bit0-7 trạng thái cổng gửi đi, bit8-15 cổng tác động (0 = cả byte)
 *           -> {"com":1,"value":action & 0xFF[,"mask":action >> 8]}.
 *
 * Chống lặp: chỉ chạy khi điều kiện chuyển sai -> đúng (một lần mỗi cạnh lên).
 * Ngữ cảnh nạp lúc khởi động chưa biết trạng thái trước nên lần đánh giá đầu
 * chỉ ghi nhận, không chạy; ngữ cảnh mới tạo/sửa thì chạy ngay nếu đang đúng.
 * Cooldown: hai lần chạy cách nhau tối thiểu cooldownS (cạnh lên trong thời
 * gian này được giữ chờ, nếu điều kiện vẫn đúng). Timeout/Retry: sau khi gửi,
 * chờ thiết bị đích báo đúng trạng thái trong timeoutS, nếu không thì kiểm tra
 * lại và gửi lại tối đa retry lần.
 * Thủ công ưu tiên: thiết bị đích vừa được điều khiển tay (web, nút nhấn) thì
 * trong manualHoldMs các ngữ cảnh nhắm vào nó bị bỏ qua.
 * Kiểm tra trước khi gửi: thiết bị đích phải đang trực tuyến; nếu đã ở đúng
 * trạng thái thì không gửi. Nhiều ngữ cảnh cùng lúc trên một thiết bị đích:
 * priority cao hơn thắng (bằng nhau: id nhỏ hơn).
 */
const DEFAULT_OPTIONS = {
  manualHoldMs: 5 * 60 * 1000,
  // A device that has not reported for this long is offline.
  offlineMs: 90 * 1000,
  // A deferred trigger (cooldown, offline, busy target) is dropped after this.
  pendingMaxMs: 5 * 60 * 1000,
};

function popcount(value) {
  let count = 0;
  for (let v = value; v; v &= v - 1) count++;
  return count;
}

function sensorCondition(index, above) {
  return (status, state) => {
    const value = status.sensors ? status.sensors[index] : undefined;
    if (!Number.isFinite(value)) return null;
    return above ? value > state : value < state;
  };
}

// content -> (status, state) => true | false | null (null = cannot tell).
// New kinds of condition are added here.
const CONDITIONS = {
  1: (s, state) => (Number.isInteger(s.port) ? state > 0 && (s.port & state) === state : null),
  2: (s, state) => (Number.isInteger(s.port) ? (s.port & state) !== 0 : null),
  3: (s, state) => (Number.isInteger(s.port) ? (s.port & state) === 0 : null),
  4: (s, state) => (Number.isInteger(s.port) ? popcount(s.port & state) % 2 === 1 : null),
};
for (let n = 0; n < 4; n++) {
  CONDITIONS[5 + n] = sensorCondition(n, true);
  CONDITIONS[9 + n] = sensorCondition(n, false);
}

function decodeAction(action) {
  const value = action & 0xFF;
  const mask = (action >> 8) & 0xFF;
  return { value, mask, compareMask: mask || 0xFF };
}

class ContextEngine {
  /**
   * send(targetDeviceId, command) -> Promise; log(level, message).
   */
  constructor({ send, now = Date.now, log = () => {}, options = {} }) {
    this.send = send;
    this.now = now;
    this.log = log;
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.contexts = new Map();   // id -> context
    this.runtime = new Map();    // id -> { result, pendingSince, lastFiredAt, execution, lastOutcome, lastError, at }
    this.devices = new Map();    // deviceId -> { port, button, sensors, at }
    this.manualUntil = new Map(); // deviceId -> ms
  }

  // Startup load: previous condition values are unknown, so nothing fires
  // until a condition changes.
  setContexts(list) {
    this.contexts.clear();
    this.runtime.clear();
    list.forEach((context) => this._add(context, null));
  }

  // Created or edited: fires at the next evaluation if the condition holds.
  upsertContext(context) {
    const previous = this.runtime.get(context.id);
    this._add(context, false);
    if (previous && previous.execution) this.runtime.get(context.id).execution = null;
    this._evaluate(context);
    this._processPending();
  }

  removeContext(id) {
    this.contexts.delete(id);
    this.runtime.delete(id);
  }

  _add(context, result) {
    this.contexts.set(context.id, context);
    this.runtime.set(context.id, {
      result, pendingSince: null, lastFiredAt: null, execution: null,
      lastOutcome: null, lastError: null, at: null,
    });
  }

  // A web command or a button press on the device: manual priority.
  noteManual(deviceId) {
    this.manualUntil.set(deviceId, this.now() + this.options.manualHoldMs);
  }

  isManualHold(deviceId) {
    return (this.manualUntil.get(deviceId) || 0) > this.now();
  }

  // Status of a device: { port, button, sensors[] } (any field may be missing).
  handleStatus(deviceId, status) {
    const previous = this.devices.get(deviceId);
    if (previous && Number.isInteger(status.button) && Number.isInteger(previous.button) &&
        status.button !== previous.button) {
      this.noteManual(deviceId);  // The device button was pressed.
    }
    const merged = Object.assign({}, previous, status, { at: this.now() });
    this.devices.set(deviceId, merged);
    this._confirmExecutions(deviceId, merged);
    this.contexts.forEach((context) => {
      if (context.sourceDeviceId === deviceId) this._evaluate(context);
    });
    this._processPending();
  }

  // The target refused a command (wrong password): no retry.
  handleRejected(deviceId, reason) {
    this.runtime.forEach((run, id) => {
      const context = this.contexts.get(id);
      if (run.execution && context && context.targetDeviceId === deviceId) {
        run.execution = null;
        this._outcome(run, 'failed', reason);
      }
    });
  }

  // Timeouts, retries and deferred triggers; call about every second.
  tick() {
    const now = this.now();
    this.runtime.forEach((run, id) => {
      const context = this.contexts.get(id);
      if (!context || !run.execution) return;
      const execution = run.execution;
      if (now - execution.sentAt < context.timeoutS * 1000) return;
      const target = this.devices.get(context.targetDeviceId);
      const action = decodeAction(context.action);
      if (target && this._inState(target, action)) {
        run.execution = null;
        this._outcome(run, 'ok');
        return;
      }
      if (execution.attempt > context.retry) {
        run.execution = null;
        this._outcome(run, 'failed', 'thiết bị đích không xác nhận sau ' + execution.attempt + ' lần gửi');
        return;
      }
      execution.attempt++;
      execution.sentAt = now;
      this._send(context, run, action);
    });
    this._processPending();
  }

  status(id) {
    const run = this.runtime.get(id);
    if (!run) return null;
    return {
      result: run.result,
      pending: run.pendingSince != null,
      executing: !!run.execution,
      attempt: run.execution ? run.execution.attempt : 0,
      lastFiredAt: run.lastFiredAt,
      lastOutcome: run.lastOutcome,
      lastError: run.lastError,
      at: run.at,
    };
  }

  _evaluate(context) {
    const run = this.runtime.get(context.id);
    if (!run) return;
    if (!context.enabled) {
      run.result = null;
      run.pendingSince = null;
      return;
    }
    const source = this.devices.get(context.sourceDeviceId);
    const condition = CONDITIONS[context.content];
    if (!source || !condition) return;
    const result = condition(source, context.state);
    if (result === null) return;  // Value not reported: keep the last result.
    if (result && run.result === false) run.pendingSince = this.now();
    if (!result) run.pendingSince = null;
    run.result = result;
  }

  _processPending() {
    const now = this.now();
    // Best pending context per target: priority, then id.
    const chosen = new Map();
    this.runtime.forEach((run, id) => {
      const context = this.contexts.get(id);
      if (!context || run.pendingSince == null) return;
      if (now - run.pendingSince > this.options.pendingMaxMs) {
        run.pendingSince = null;
        this._outcome(run, 'skipped', null, 'quá hạn chờ (thiết bị đích offline, đang bận hoặc cooldown)');
        return;
      }
      const best = chosen.get(context.targetDeviceId);
      if (!best || context.priority > best.priority || (context.priority === best.priority && context.id < best.id)) {
        if (best) this._skipConflict(best, context);
        chosen.set(context.targetDeviceId, context);
      } else {
        this._skipConflict(context, best);
      }
    });
    chosen.forEach((context) => this._tryFire(context));
  }

  _skipConflict(loser, winner) {
    const run = this.runtime.get(loser.id);
    run.pendingSince = null;
    this._outcome(run, 'skipped', null, 'ngữ cảnh #' + winner.id + ' ưu tiên cao hơn trên cùng thiết bị đích');
  }

  _tryFire(context) {
    const run = this.runtime.get(context.id);
    const now = this.now();
    const targetId = context.targetDeviceId;
    if (this.isManualHold(targetId)) {
      run.pendingSince = null;
      this._outcome(run, 'skipped', null, 'thiết bị đích vừa được điều khiển thủ công');
      return;
    }
    // Wait: cooldown, another command still in flight on the target, target offline.
    if (run.lastFiredAt != null && now - run.lastFiredAt < context.cooldownS * 1000) return;
    for (const [id, other] of this.runtime) {
      const otherContext = this.contexts.get(id);
      if (other.execution && otherContext && otherContext.targetDeviceId === targetId) return;
    }
    const target = this.devices.get(targetId);
    if (!target || now - target.at > this.options.offlineMs) return;

    run.pendingSince = null;
    run.lastFiredAt = now;
    const action = decodeAction(context.action);
    if (this._inState(target, action)) {
      this._outcome(run, 'ok', null, 'thiết bị đích đã ở đúng trạng thái, không gửi');
      return;
    }
    run.execution = { attempt: 1, sentAt: now };
    this._send(context, run, action);
  }

  _send(context, run, action) {
    const command = { com: 1, value: action.value };
    if (action.mask) command.mask = action.mask;
    this.log('info', 'Context #' + context.id + ' -> device ' + context.targetDeviceId + ' ' +
      JSON.stringify(command) + ' (lần ' + run.execution.attempt + ')');
    Promise.resolve()
      .then(() => this.send(context.targetDeviceId, command))
      .catch((error) => {
        // Not published (broker down, ACL): the timeout retries it.
        run.lastError = error.message;
        this.log('warn', 'Context #' + context.id + ' send failed: ' + error.message);
      });
  }

  _confirmExecutions(deviceId, status) {
    this.runtime.forEach((run, id) => {
      const context = this.contexts.get(id);
      if (!run.execution || !context || context.targetDeviceId !== deviceId) return;
      if (this._inState(status, decodeAction(context.action))) {
        run.execution = null;
        this._outcome(run, 'ok');
      }
    });
  }

  _inState(status, action) {
    return Number.isInteger(status.port) && (status.port & action.compareMask) === (action.value & action.compareMask);
  }

  _outcome(run, outcome, error, note) {
    run.lastOutcome = note ? outcome + ': ' + note : outcome;
    run.lastError = error || null;
    run.at = this.now();
  }
}

module.exports = { ContextEngine, CONDITIONS, decodeAction };
