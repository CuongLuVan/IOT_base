
#define DEVICE_LOG_DEFAULT_LEVEL 4


inline  void DEVICE_LOG_INTERNAL_MODULE( int level, String log_info){
    if(level <= DEVICE_LOG_DEFAULT_LEVEL)                                                
    {                                                                                       
        Serial.println(log_info);                                                                       \
    }      
}

#define DEVICE_LOG_INTERNAL_ERROR(log_info) \
                DEVICE_LOG_INTERNAL_MODULE(1, log_info)
#define DEVICE_LOG_INTERNAL_WARNING(log_info) \
            DEVICE_LOG_INTERNAL_MODULE(2, log_info)
#define DEVICE_LOG_INTERNAL_INFO(log_info) \
        DEVICE_LOG_INTERNAL_MODULE(3, log_info)
#define DEVICE_LOG_INTERNAL_DEBUG(log_info) \
        DEVICE_LOG_INTERNAL_MODULE(4,log_info)


#define DEVICE_LOG_ERROR(log_info)                     DEVICE_LOG_INTERNAL_ERROR(log_info)
#define DEVICE_LOG_WARNING(log_info)                   DEVICE_LOG_INTERNAL_WARNING(log_info)
#define DEVICE_LOG_INFO(log_info)                      DEVICE_LOG_INTERNAL_INFO(log_info)
#define DEVICE_LOG_DEBUG(log_info)                     DEVICE_LOG_INTERNAL_DEBUG(log_info)
