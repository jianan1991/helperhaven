package com.helperhaven.catalog;

import com.helperhaven.catalog.dto.ServiceItemView;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.repo.ServiceItemRepository;
import com.helperhaven.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class CatalogService {

    private final ServiceItemRepository repo;
    private final UserRepository users;

    public CatalogService(ServiceItemRepository repo, UserRepository users) {
        this.repo = repo;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<ServiceItemView> listActive() {
        return repo.findByActiveTrueOrderBySortOrderAsc()
                .stream().map(ServiceItemView::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceItemView> listAll(UUID callerId) {
        requireAdmin(callerId);
        return repo.findAll().stream()
                .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                .map(ServiceItemView::from).toList();
    }

    @Transactional
    public ServiceItemView updatePrice(UUID serviceId, int priceSgd, UUID callerId) {
        requireAdmin(callerId);
        var s = repo.findById(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found"));
        s.setPriceSgd(priceSgd);
        return ServiceItemView.from(repo.save(s));
    }

    private void requireAdmin(UUID userId) {
        User u = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not found"));
        if (u.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
    }
}
