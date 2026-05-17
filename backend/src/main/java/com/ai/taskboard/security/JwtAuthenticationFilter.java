package com.ai.taskboard.security;

import com.ai.taskboard.common.constant.Constants;
import com.ai.taskboard.common.util.JwtUtil;
import com.ai.taskboard.common.util.UserContext;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = resolveToken(request);
        String uri = request.getRequestURI();
        log.info("JWT Filter - URI: {}, hasToken: {}", uri, StringUtils.hasText(token));
        if (StringUtils.hasText(token) && jwtUtil.validateToken(token)) {
            try {
                Claims claims = jwtUtil.parseToken(token);
                String type = claims.get("type", String.class);
                if (!"access".equals(type)) {
                    log.debug("JWT Filter - Not access token type: {}", type);
                    filterChain.doFilter(request, response);
                    return;
                }
                Long userId = Long.parseLong(claims.getSubject());
                String role = claims.get("role", String.class);

                String redisKey = Constants.REDIS_ACCESS_TOKEN_PREFIX + userId;
                Object storedToken = redisTemplate.opsForValue().get(redisKey);
                log.info("JWT Filter - userId: {}, redisKey: {}, storedToken: {}", userId, redisKey, storedToken != null ? "exists" : "null");
                if (storedToken == null || !String.valueOf(storedToken).equals(token)) {
                    log.warn("JWT Filter - Token mismatch for userId: {}, stored equals: {}", userId, String.valueOf(storedToken).equals(token));
                    filterChain.doFilter(request, response);
                    return;
                }

                UserContext.setUserId(userId);
                UserContext.setUserRole(role);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userId, null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.info("JWT Filter - Authentication set for userId: {}, role: {}", userId, role);
            } catch (Exception e) {
                log.error("JWT Filter - Exception: {}", e.getMessage());
                UserContext.clear();
                SecurityContextHolder.clearContext();
            }
        } else {
            log.debug("JWT Filter - No valid token for URI: {}", uri);
        }
        try {
            filterChain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader(Constants.AUTH_HEADER);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(Constants.TOKEN_PREFIX)) {
            return bearerToken.substring(Constants.TOKEN_PREFIX.length());
        }
        return null;
    }
}
