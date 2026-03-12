

#define NRF_LOG_INTERNAL_MODULE(level, level_id, ...)                                    \
    if(level <= NRF_LOG_DEFAULT_LEVEL)                                                \
    {                                                                                    \
        if (NRF_LOG_FILTER >= level)                                                     \
        {                                                                                \
            LOG_INTERNAL(LOG_SEVERITY_MOD_ID(level_id), __VA_ARGS__);                    \
        }                                                                                \
    }

#define NRF_LOG_SEVERITY_DEBUG 3 

#define NRF_LOG_INTERNAL_ERROR(...) \
                NRF_LOG_INTERNAL_MODULE(1, NRF_LOG_SEVERITY_DEBUG,__VA_ARGS__)
#define NRF_LOG_INTERNAL_WARNING(...) \
            NRF_LOG_INTERNAL_MODULE(2, NRF_LOG_SEVERITY_DEBUG,__VA_ARGS__)
#define NRF_LOG_INTERNAL_INFO(...) \
        NRF_LOG_INTERNAL_MODULE(3, NRF_LOG_SEVERITY_DEBUG, __VA_ARGS__)
#define NRF_LOG_INTERNAL_DEBUG(...) \
        NRF_LOG_INTERNAL_MODULE(4, NRF_LOG_SEVERITY_DEBUG, __VA_ARGS__)


#define NRF_LOG_ERROR(...)                     NRF_LOG_INTERNAL_ERROR(__VA_ARGS__)
#define NRF_LOG_WARNING(...)                   NRF_LOG_INTERNAL_WARNING( __VA_ARGS__)
#define NRF_LOG_INFO(...)                      NRF_LOG_INTERNAL_INFO( __VA_ARGS__)
#define NRF_LOG_DEBUG(...)                     NRF_LOG_INTERNAL_DEBUG( __VA_ARGS__)
