package com.edu.uta.backend.config;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class NormativaFinancieraException extends RuntimeException {
    public NormativaFinancieraException(String message) {
        super(message);
    }
}
