import React from 'react';
import { Button, Divider, Grid, Paper, TextField, Typography } from '@material-ui/core';
import Swal from 'sweetalert2';
import { saveCertificateMqtt } from '../../../api/httpBaseUtil';

// DeviceIOT hotspot (NetWork_Wifi::setupHostPost): SSID/password "setup_now",
// web server on the soft AP address.
const DEVICE_HOTSPOT_SSID = 'setup_now';
const DEFAULT_DEVICE_IP = '192.168.4.1';

// Limits of the device firmware (NetWork_Mqtt.cpp SYSCFG, define_All.h).
const INPUT_FIELDS = [
  { name: 'mqtt_id', label: 'MQTT Client ID', maxLength: 32, required: true, helperText: 'Chữ, số, . _ - (CN của chứng chỉ)' },
  { name: 'content', label: 'Tên / mô tả', maxLength: 40, required: true },
  { name: 'mqtt_user', label: 'MQTT username', maxLength: 32, required: true },
  { name: 'mqtt_pass', label: 'MQTT password', maxLength: 32, required: true, type: 'password' },
  { name: 'mqtt_pub', label: 'Topic publish', maxLength: 40, required: true, helperText: 'Không dùng + hoặc #' },
  { name: 'mqtt_sub', label: 'Topic subscribe', maxLength: 40, required: true },
  { name: 'mqtt_host', label: 'MQTT broker host / IP', maxLength: 127, required: true },
  { name: 'mqtt_port', label: 'MQTT broker port', maxLength: 5, required: true, type: 'number' },
];

const DEVICE_FIELDS = [
  { name: 'device_ip', label: 'IP device (hotspot)', maxLength: 64, required: true },
];

const OUTPUT_FIELDS = [
  { name: 'caCertificate', file: 'caCertificate', label: 'CA certificate (PEM)' },
  { name: 'certificate', file: 'certificate', label: 'Client certificate (PEM)' },
  { name: 'deviceKey', file: 'deviceKey', label: 'Device private key (SEC1, lưu vào EEPROM)' },
  { name: 'privateKey', file: 'privateKey', label: 'Private key (PKCS#8, cho client Node.js)' },
];

const initialInput = {
  mqtt_id: '',
  content: '',
  mqtt_user: '',
  mqtt_pass: '',
  mqtt_pub: '',
  mqtt_sub: '',
  mqtt_host: '103.1.238.175',
  mqtt_port: '1885',
  device_ip: DEFAULT_DEVICE_IP,
};

function validateInput(input) {
  if (!/^[A-Za-z0-9_.-]{1,32}$/.test(input.mqtt_id)) return 'MQTT Client ID không hợp lệ.';
  if (/[+#]/.test(input.mqtt_pub)) return 'Topic publish không được chứa + hoặc #.';
  const port = Number(input.mqtt_port);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return 'Port không hợp lệ.';
  const missing = INPUT_FIELDS.find((field) => field.required && !String(input[field.name]).trim());
  return missing ? missing.label + ' là bắt buộc.' : null;
}

// Body of DeviceIOT POST /setup (NetWork_Wifi::handleSetUp). Wi-Fi credentials
// are provisioned separately, so they are never sent here.
function buildDevicePayload(input, result) {
  return {
    mqtt_host: input.mqtt_host.trim(),
    mqtt_port: Number(input.mqtt_port),
    mqtt_client: result.mqtt_id,
    mqtt_user: input.mqtt_user.trim(),
    mqtt_pwd: input.mqtt_pass.trim(),
    public_topic: input.mqtt_pub.trim(),
    subcribe_topic: input.mqtt_sub.trim(),
    mqtt_ca_cert: result.caCertificate,
    mqtt_client_cert: result.certificate,
    mqtt_private_key: result.deviceKey,
    mqtt_auth_key_id: result.mqtt_id,
    mqtt_auth_secret: result.mqtt_message_key,
  };
}

// An HTTPS admin page cannot fetch() the device over HTTP (mixed content), but
// a top-level form submission is still allowed after the browser warning.
function submitFormToDevice(url, body) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  form.target = '_blank';
  const field = document.createElement('input');
  field.type = 'hidden';
  field.name = 'data';
  field.value = body;
  form.appendChild(field);
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

const DeviceCertificateSetup = () => {
  const [input, setInput] = React.useState(initialInput);
  const [result, setResult] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setInput((current) => ({ ...current, [name]: value }));
  };

  const createCertificate = async (event) => {
    event.preventDefault();
    const error = validateInput(input);
    if (error) {
      Swal.fire('Thông tin chưa hợp lệ', error, 'warning');
      return;
    }
    setResult(null);
    try {
      const response = await saveCertificateMqtt({
        mqtt_id: input.mqtt_id.trim(),
        content: input.content.trim(),
        mqtt_user: input.mqtt_user.trim(),
        mqtt_pass: input.mqtt_pass.trim(),
        mqtt_pub: input.mqtt_pub.trim(),
        mqtt_sub: input.mqtt_sub.trim(),
      });
      setResult(response.data);
      Swal.fire('Đã tạo chứng chỉ', 'Kết nối máy tính vào Wi-Fi "' + DEVICE_HOTSPOT_SSID +
        '" của device rồi bấm "Gửi tới device".', 'success');
    } catch (requestError) {
      // httpPostData already reports the failure.
    }
  };

  const sendToDevice = async () => {
    const ip = input.device_ip.trim();
    if (!/^[A-Za-z0-9.-]+(:\d{1,5})?$/.test(ip)) {
      Swal.fire('IP device không hợp lệ', ip, 'warning');
      return;
    }
    const url = 'http://' + ip + '/setup';
    const body = JSON.stringify(buildDevicePayload(input, result));
    setSending(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(body),
      });
      const reply = await response.json().catch(() => ({}));
      if (!response.ok || !reply.success) {
        throw new Error(reply.error || 'HTTP ' + response.status);
      }
      Swal.fire('Đã gửi tới device', 'Device đã lưu cấu hình và đang khởi động lại.', 'success');
    } catch (error) {
      if (error instanceof TypeError) {
        submitFormToDevice(url, body);
        Swal.fire('Đã mở tab gửi tới device',
          'Trình duyệt chặn gọi trực tiếp tới ' + ip + '. Kết quả {"success":true} hiển thị ở tab mới.', 'info');
      } else {
        Swal.fire('Device từ chối cấu hình', error.message, 'error');
      }
    } finally {
      setSending(false);
    }
  };

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      Swal.fire({ title: 'Đã sao chép', icon: 'success', timer: 1000, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Không thể sao chép', 'Hãy chọn và sao chép thủ công.', 'error');
    }
  };

  const renderField = (field) => (
    <Grid item xs={12} sm={6} key={field.name}>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        name={field.name}
        label={field.label}
        type={field.type || 'text'}
        required={field.required}
        value={input[field.name]}
        onChange={onChange}
        helperText={field.helperText}
        inputProps={{ maxLength: field.maxLength }}
      />
    </Grid>
  );

  const fileHint = (key) => {
    const file = result && result.files && result.files[key];
    if (!file) return '';
    return file.name + ' — ' + file.size + ' B' + (file.maxSize ? ' / tối đa ' + file.maxSize + ' B' : '');
  };

  return (
    <Paper style={{ padding: 24, margin: 16 }}>
      <Typography variant="h5" gutterBottom>Tạo chứng chỉ &amp; cấu hình DeviceIOT</Typography>
      <form onSubmit={createCertificate}>
        <Typography variant="subtitle1" gutterBottom>Thông tin MQTT</Typography>
        <Grid container spacing={2}>{INPUT_FIELDS.map(renderField)}</Grid>
        <Button type="submit" variant="contained" color="primary" style={{ marginTop: 16 }}>
          Tạo chứng chỉ ECDSA P-256
        </Button>
      </form>

      {result && (
        <React.Fragment>
          <Divider style={{ margin: '24px 0' }} />
          <Typography variant="subtitle1" gutterBottom>Kết quả</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth variant="outlined" size="small" label="MQTT Client ID"
                value={result.mqtt_id || ''} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth variant="outlined" size="small" label="SHA-256 fingerprint"
                value={result.fingerprint256 || ''} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth variant="outlined" size="small" label="Message authentication key (HMAC)"
                value={result.mqtt_message_key || ''} InputProps={{ readOnly: true }} />
            </Grid>
            {OUTPUT_FIELDS.map((field) => (
              <Grid item xs={12} md={6} key={field.name}>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  variant="outlined"
                  label={field.label}
                  helperText={fileHint(field.file)}
                  value={result[field.name] || ''}
                  InputProps={{ readOnly: true, style: { fontFamily: 'Consolas, monospace', fontSize: 12 } }}
                />
                <Button size="small" onClick={() => copy(result[field.name] || '')}>Sao chép</Button>
              </Grid>
            ))}
          </Grid>

          <Divider style={{ margin: '24px 0' }} />
          <Typography variant="subtitle1" gutterBottom>Gửi tới DeviceIOT (chế độ hotspot)</Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Đưa device vào chế độ hotspot, kết nối máy tính vào Wi-Fi "{DEVICE_HOTSPOT_SSID}"
            (mật khẩu "{DEVICE_HOTSPOT_SSID}") rồi bấm gửi. Device lưu chứng chỉ, host/port broker,
            topic và HMAC key vào EEPROM rồi khởi động lại. Wi-Fi không được gửi ở bước này.
          </Typography>
          <Grid container spacing={2}>{DEVICE_FIELDS.map(renderField)}</Grid>
          <Button variant="contained" color="secondary" style={{ marginTop: 16 }}
            disabled={sending} onClick={sendToDevice}>
            {sending ? 'Đang gửi…' : 'Gửi tới device'}
          </Button>
        </React.Fragment>
      )}
    </Paper>
  );
};

export default DeviceCertificateSetup;
