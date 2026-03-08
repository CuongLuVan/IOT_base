#include "gpio/VirtualGPIO.h"
#include "gpio/ChipDefs.h"
#include <thread>
#include <chrono>
#include <iostream>

/**
 * EXAMPLE: Mode Switching - Hiểu khác biệt giữa SIMULATION và REAL HARDWARE
 * 
 * Bài học:
 * - Cùng code có thể chạy trên cả 2 mode
 * - Simulation mode: Output lên terminal
 * - Real hardware: Gọi GPIO driver thực tế
 */

// Hàm blink LED - cùng code cho cả 2 mode
void blinkLED(VirtualGPIO& board, int pin, int times = 3) {
    std::cout << "\n[Function] Blinking LED " << times << " times...\n" << std::endl;
    
    for (int i = 0; i < times; i++) {
        board.digitalWrite(pin, HIGH);
        std::this_thread::sleep_for(std::chrono::milliseconds(300));
        
        board.digitalWrite(pin, LOW);
        std::this_thread::sleep_for(std::chrono::milliseconds(300));
    }
}

int main() {
    std::cout << "\n╔═══════════════════════════════════════════════════╗\n"
              << "║        GPIO SIMULATOR - MODE SWITCHING DEMO        ║\n"
              << "║  Hiểu cách chuyển đổi từ Simulation sang Hardware  ║\n"
              << "╚═══════════════════════════════════════════════════╝\n" << std::endl;
    
    // ═════════════════════════════════════════════════════════════
    // STAGE 1: SIMULATION MODE
    // ═════════════════════════════════════════════════════════════
    std::cout << "╔═ STAGE 1: SIMULATION MODE ═╗\n" << std::endl;
    std::cout << "Mô phỏng trên máy tính, không cần hardware\n" << std::endl;
    
    VirtualGPIO board_sim(ESP32, true);  // true = SIMULATION
    board_sim.printChipInfo();
    
    board_sim.pinMode(2, OUTPUT);
    board_sim.pinMode(13, OUTPUT);
    
    std::cout << "\n[PHASE 1] Testing with simulated LED on pin 2\n" << std::endl;
    blinkLED(board_sim, 2, 2);
    
    std::cout << "\n[INFO] Trong SIMULATION mode:\n"
              << "  • Mỗi digitalWrite() in ra terminal\n"
              << "  • Format: [ESP32 SIM] Pin X = HIGH/LOW\n"
              << "  • Giúp debug code trước khi upload\n" << std::endl;
    
    std::this_thread::sleep_for(std::chrono::milliseconds(1000));
    
    // ═════════════════════════════════════════════════════════════
    // STAGE 2: MODE SWITCHING
    // ═════════════════════════════════════════════════════════════
    std::cout << "\n╔═ STAGE 2: SWITCHING TO REAL HARDWARE MODE ═╗\n" << std::endl;
    std::cout << "Chuyển chế độ mà không cần thay đổi code!\n" << std::endl;
    
    std::cout << "[ACTION] Gọi: board_sim.setSimulationMode(false)\n" << std::endl;
    board_sim.setSimulationMode(false);
    
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    std::cout << "\n[PHASE 2] Testing with REAL HARDWARE driver\n" << std::endl;
    blinkLED(board_sim, 2, 2);
    
    std::cout << "\n[INFO] Trong REAL HARDWARE mode:\n"
              << "  • digitalWrite() gọi GPIO driver thực tế\n"
              << "  • Format: [ESP32 HW] Pin X = HIGH/LOW [REAL]\n"
              << "  • LED thực sự sáng/tắt trên board\n"
              << "  • Simulation print bị xóa hoặc không in\n" << std::endl;
    
    std::this_thread::sleep_for(std::chrono::milliseconds(1000));
    
    // ═════════════════════════════════════════════════════════════
    // STAGE 3: BACK TO SIMULATION
    // ═════════════════════════════════════════════════════════════
    std::cout << "\n╔═ STAGE 3: BACK TO SIMULATION MODE ═╗\n" << std::endl;
    std::cout << "Quay lại SIMULATION để test thêm\n" << std::endl;
    
    std::cout << "[ACTION] Gọi: board_sim.setSimulationMode(true)\n" << std::endl;
    board_sim.setSimulationMode(true);
    
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    std::cout << "\n[PHASE 3] Back to simulation\n" << std::endl;
    blinkLED(board_sim, 13, 2);
    
    // ═════════════════════════════════════════════════════════════
    // STAGE 4: BEST PRACTICE - MULTIPLE CHIPS
    // ═════════════════════════════════════════════════════════════
    std::cout << "\n╔═ STAGE 4: MULTIPLE CHIPS COMPARISON ═╗\n" << std::endl;
    
    std::cout << "Thử với các chip khác nhau - cùng code!\n" << std::endl;
    
    ChipType chips[] = {ESP32, ESP8266, STM32, MSP430, AVR};
    std::string chipNames[] = {"ESP32", "ESP8266", "STM32", "MSP430", "AVR"};
    
    for (int i = 0; i < 5; i++) {
        std::cout << "\n  ➤ Testing " << chipNames[i] << std::endl;
        
        VirtualGPIO board(chips[i], true);
        board.pinMode(0, OUTPUT);
        board.digitalWrite(0, HIGH);
        
        std::this_thread::sleep_for(std::chrono::milliseconds(200));
    }
    
    // ═════════════════════════════════════════════════════════════
    // SUMMARY
    // ═════════════════════════════════════════════════════════════
    std::cout << "\n╔═══════════════════════════════════════════════════╗\n"
              << "║                  SUMMARY                           ║\n"
              << "╚═══════════════════════════════════════════════════╝\n" << std::endl;
    
    std::cout << "✅ Advantages của Architecture này:\n"
              << "   1. Code không thay đổi giữa 2 mode\n"
              << "   2. Phát triển nhanh trên máy tính (simulation)\n"
              << "   3. Tester có thể kiểm tra logic trước upload\n"
              << "   4. Deploy lên hardware chỉ cần 1 dòng code\n"
              << "   5. Hỗ trợ nhiều chip mà không cần rewrite\n\n"
              << "🎯 Workflow:\n"
              << "   1. Write code giống Arduino\n"
              << "   2. Test ở mode SIMULATION (terminal output)\n"
              << "   3. Switch sang mode REAL HARDWARE\n"
              << "   4. Upload lên board thực tế\n\n"
              << "💡 Khi deploy lên hardware thực:\n"
              << "   • Thay setSimulationMode(true) → setSimulationMode(false)\n"
              << "   • Hoặc xóa VirtualGPIO, dùng HAL thực tế\n" << std::endl;
    
    std::cout << "\n✓ Demo completed successfully!\n" << std::endl;
    
    return 0;
}
