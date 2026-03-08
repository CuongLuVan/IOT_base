#ifndef CONFIG_H
#define CONFIG_H

// Define SUPPORT_RTOS to 1 if you want each task to run in its own thread.
// Set to 0 for a simple cooperative scheduler (loop calling Task::run manually).
#define SUPPORT_RTOS 1

#endif // CONFIG_H
