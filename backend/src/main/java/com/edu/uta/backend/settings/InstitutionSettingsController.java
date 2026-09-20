package com.edu.uta.backend.settings;

import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.edu.uta.backend.identity.IdentityService;

@RestController
@RequestMapping("/api")
public class InstitutionSettingsController {

    private final InstitutionSettingsService settings;
    private final IdentityService identity;

    public InstitutionSettingsController(InstitutionSettingsService settings, IdentityService identity) {
        this.settings = settings;
        this.identity = identity;
    }

    public record UpdateSettings(Map<String, String> values) {}

    @GetMapping("/public/settings")
    public InstitutionSettingsService.SettingsView publicSettings() {
        return settings.effectiveSettings();
    }

    @GetMapping("/public/settings/assets/{key}")
    public ResponseEntity<byte[]> publicAsset(@PathVariable String key) {
        InstitutionSettingsService.Asset asset = settings.asset(key);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .contentType(MediaType.parseMediaType(asset.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(asset.fileName()).build().toString())
                .body(asset.content());
    }

    @GetMapping("/admin/settings")
    @PreAuthorize("hasAuthority('institution.manage')")
    public InstitutionSettingsService.SettingsView adminSettings() {
        return settings.effectiveSettings();
    }

    @GetMapping("/admin/settings/sections/{category}/defaults")
    @PreAuthorize("hasAuthority('institution.manage')")
    public Map<String, String> defaults(@PathVariable String category) {
        return settings.defaultsFor(category);
    }

    @PutMapping("/admin/settings/sections/{category}")
    @PreAuthorize("hasAuthority('institution.manage')")
    public InstitutionSettingsService.SettingsView update(@PathVariable String category,
            @RequestBody UpdateSettings request, Authentication authentication) {
        long userId = identity.accountByEmail(authentication.getName()).id();
        return settings.updateSection(category, request.values(), userId);
    }

    @DeleteMapping("/admin/settings/sections/{category}")
    @PreAuthorize("hasAuthority('institution.manage')")
    public InstitutionSettingsService.SettingsView resetSection(@PathVariable String category) {
        return settings.resetSection(category);
    }

    @DeleteMapping("/admin/settings/sections/{category}/{key}")
    @PreAuthorize("hasAuthority('institution.manage')")
    public InstitutionSettingsService.SettingsView resetField(@PathVariable String category,
            @PathVariable String key) {
        return settings.resetField(category, key);
    }

    @PutMapping(value = "/admin/settings/assets/{key}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('institution.manage')")
    public InstitutionSettingsService.SettingsView upload(@PathVariable String key,
            @RequestParam("file") MultipartFile file, Authentication authentication) {
        long userId = identity.accountByEmail(authentication.getName()).id();
        return settings.saveAsset(key, file, userId);
    }

    @DeleteMapping("/admin/settings/assets/{key}")
    @PreAuthorize("hasAuthority('institution.manage')")
    public InstitutionSettingsService.SettingsView resetAsset(@PathVariable String key) {
        return settings.resetAsset(key);
    }

    @DeleteMapping("/admin/settings/assets")
    @PreAuthorize("hasAuthority('institution.manage')")
    public InstitutionSettingsService.SettingsView resetAssets() {
        return settings.resetAssets();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> missing(NoSuchElementException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
    }
}
