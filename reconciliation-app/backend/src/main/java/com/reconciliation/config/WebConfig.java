package com.reconciliation.config;

import com.reconciliation.interceptor.PermissionInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private PermissionInterceptor permissionInterceptor;

    @Override
    public void addInterceptors(@org.springframework.lang.NonNull InterceptorRegistry registry) {
        registry.addInterceptor(permissionInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                    "/api/profils/permissions/generate",
                    "/api/profils/diagnostic",
                    "/api/auth/**",
                    "/api/users/check-admin",
                    "/api/users/me",
                    "/api/users/me/password",
                    "/error"
                );
    }

    /**
     * Configure les message converters pour utiliser UTF-8
     * Cela garantit que toutes les réponses JSON et texte utilisent UTF-8
     */
    @Override
    public void configureMessageConverters(@org.springframework.lang.NonNull List<HttpMessageConverter<?>> converters) {
        // Configurer le StringHttpMessageConverter pour UTF-8
        StringHttpMessageConverter stringConverter = new StringHttpMessageConverter(StandardCharsets.UTF_8);
        converters.add(stringConverter);
        
        // Configurer le MappingJackson2HttpMessageConverter pour UTF-8
        MappingJackson2HttpMessageConverter jsonConverter = new MappingJackson2HttpMessageConverter();
        jsonConverter.setDefaultCharset(StandardCharsets.UTF_8);
        converters.add(jsonConverter);
    }
}
