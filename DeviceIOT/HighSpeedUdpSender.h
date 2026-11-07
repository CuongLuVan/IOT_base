#pragma once

// Sends the high-speed capture datagrams queued by HighSpeedSampler
// (docs/HighSpeedAcquisition.md). DeviceIOT (ESP32) only; call from the
// network task.

namespace high_speed_udp {

// Opens the UDP socket.
void begin();
// Reopens the socket after a new DHCP lease.
void rebind();
// Sends up to HS_NETWORK_DRAIN_BATCH datagrams. While the link is down the
// datagrams are dropped and counted, and the next datagram that leaves
// carries the count.
void service(bool linkUp);

}  // namespace high_speed_udp
