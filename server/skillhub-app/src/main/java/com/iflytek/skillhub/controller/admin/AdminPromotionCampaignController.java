package com.iflytek.skillhub.controller.admin;

import com.iflytek.skillhub.controller.BaseApiController;
import com.iflytek.skillhub.domain.promotion.PromotionCampaignStatus;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.dto.PageResponse;
import com.iflytek.skillhub.dto.promotion.CreatePromotionCampaignRequest;
import com.iflytek.skillhub.dto.promotion.PromotionCampaignResponse;
import com.iflytek.skillhub.dto.promotion.PromotionCampaignReviewRequest;
import com.iflytek.skillhub.service.promotion.PromotionCampaignAppService;
import jakarta.validation.Valid;
import java.util.Set;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin endpoints for operational promotion campaigns: create, approve, reject, end and list.
 */
@RestController
@RequestMapping("/api/v1/admin/promotion-campaigns")
public class AdminPromotionCampaignController extends BaseApiController {

    private final PromotionCampaignAppService appService;

    public AdminPromotionCampaignController(PromotionCampaignAppService appService,
                                            ApiResponseFactory responseFactory) {
        super(responseFactory);
        this.appService = appService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SKILL_ADMIN','SUPER_ADMIN')")
    public ApiResponse<PromotionCampaignResponse> create(@Valid @RequestBody CreatePromotionCampaignRequest request,
                                                         @RequestAttribute("userId") String userId) {
        return ok("response.success.created", appService.createCampaign(request, userId));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SKILL_ADMIN','SUPER_ADMIN','AUDITOR')")
    public ApiResponse<PromotionCampaignResponse> approve(@PathVariable Long id,
                                                          @RequestBody(required = false) PromotionCampaignReviewRequest body,
                                                          @RequestAttribute("userId") String userId,
                                                          @RequestAttribute(value = "platformRoles", required = false) Set<String> platformRoles) {
        String comment = body == null ? null : body.comment();
        return ok("response.success.updated", appService.approve(id, comment, userId, isPlatformAdmin(platformRoles)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SKILL_ADMIN','SUPER_ADMIN','AUDITOR')")
    public ApiResponse<PromotionCampaignResponse> reject(@PathVariable Long id,
                                                         @RequestBody(required = false) PromotionCampaignReviewRequest body,
                                                         @RequestAttribute("userId") String userId) {
        String comment = body == null ? null : body.comment();
        return ok("response.success.updated", appService.reject(id, comment, userId));
    }

    @PostMapping("/{id}/end")
    @PreAuthorize("hasAnyRole('SKILL_ADMIN','SUPER_ADMIN')")
    public ApiResponse<PromotionCampaignResponse> end(@PathVariable Long id,
                                                      @RequestBody(required = false) PromotionCampaignReviewRequest body,
                                                      @RequestAttribute("userId") String userId) {
        String comment = body == null ? null : body.comment();
        return ok("response.success.updated", appService.end(id, comment, userId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SKILL_ADMIN','SUPER_ADMIN','AUDITOR')")
    public ApiResponse<PageResponse<PromotionCampaignResponse>> list(@RequestParam(defaultValue = "PENDING_REVIEW") PromotionCampaignStatus status,
                                                                     @RequestParam(defaultValue = "0") int page,
                                                                     @RequestParam(defaultValue = "20") int size) {
        return ok("response.success.read", appService.listByStatus(status, page, size));
    }

    private boolean isPlatformAdmin(Set<String> platformRoles) {
        return platformRoles != null
                && (platformRoles.contains("SKILL_ADMIN") || platformRoles.contains("SUPER_ADMIN"));
    }
}
