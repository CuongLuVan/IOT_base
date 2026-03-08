cmake_minimum_required(VERSION 3.15)
project(IOT_base)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add main executable
add_executable(app main.cpp 
    gpio/VirtualGPIO.cpp 
    TaskSensor.cpp 
    TaskDevice.cpp 
    TaskNetwork.cpp
    WifiNetwork.cpp
    RealTimeControl.cpp)

# Enable pthread for std::thread
find_package(Threads REQUIRED)
target_link_libraries(app PUBLIC Threads::Threads)

# Compiler flags for better diagnostics
if(MSVC)
    target_compile_options(app PRIVATE /W4)
else()
    target_compile_options(app PRIVATE -Wall -Wextra -Wpedantic)
endif()
