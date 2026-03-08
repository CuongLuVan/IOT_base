#include "gpio/VirtualGPIO.h"
#include "gpio/ChipDefs.h"
#include <thread>
#include <chrono>

// ============================================================
// EXAMPLE: Kỳ diệu từ STM32 - Điều khiển 3 LED theo chuỗi
// ============================================================
int main() {
    std::cout << "\n╔════════════════════════════════════════════╗\n"
              << "║   STM32 - THREE LED Sequential Control      ║\n"
              << "╚════════════════════════════════════════════╝\n" << std::endl;
    
    // Khởi tạo STM32 ở chế độ SIMULATION
    VirtualGPIO board(STM32, true);
    board.printChipInfo();
    
    // Cấu hình 3 LED pin
    board.pinMode(0, OUTPUT);
    board.pinMode(1, OUTPUT);
    board.pinMode(2, OUTPUT);
    
    std::cout << "\n[Test 1] Sequential LED Control\n" << std::endl;
    
    // Bật LED 1
    std::cout << "➤ Turning ON LED 1..." << std::endl;
    board.digitalWrite(0, HIGH);
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    // Dấy sang LED 2
    std::cout << "➤ Turning ON LED 2..." << std::endl;
    board.digitalWrite(1, HIGH);
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    // Dấy sang LED 3
    std::cout << "➤ Turning ON LED 3..." << std::endl;
    board.digitalWrite(2, HIGH);
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    // Tắt theo thứ tự
    std::cout << "\n➤ Turning OFF all LEDs in sequence...\n" << std::endl;
    
    board.digitalWrite(0, LOW);
    std::cout << "  - LED 1 OFF" << std::endl;
    std::this_thread::sleep_for(std::chrono::milliseconds(300));
    
    board.digitalWrite(1, LOW);
    std::cout << "  - LED 2 OFF" << std::endl;
    std::this_thread::sleep_for(std::chrono::milliseconds(300));
    
    board.digitalWrite(2, LOW);
    std::cout << "  - LED 3 OFF" << std::endl;
    std::this_thread::sleep_for(std::chrono::milliseconds(300));
    
    // Hiển thị trạng thái pin cuối cùng
    board.printPinStatus();
    
    std::cout << "\n✓ Test completed successfully!\n" << std::endl;
    
    return 0;
}
