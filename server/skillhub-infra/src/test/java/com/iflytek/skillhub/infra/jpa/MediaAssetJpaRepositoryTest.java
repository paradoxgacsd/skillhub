package com.iflytek.skillhub.infra.jpa;

import com.iflytek.skillhub.domain.media.MediaAsset;
import com.iflytek.skillhub.domain.media.MediaAssetRole;
import com.iflytek.skillhub.domain.media.MediaOwnerType;
import com.iflytek.skillhub.domain.media.MediaType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(excludeAutoConfiguration = JpaRepositoriesAutoConfiguration.class)
@ActiveProfiles("test")
@EntityScan(basePackageClasses = MediaAsset.class)
@ContextConfiguration(classes = MediaAssetJpaRepositoryTest.RepositoryTestConfig.class)
class MediaAssetJpaRepositoryTest {

    @Autowired
    private MediaAssetJpaRepository repository;

    @Test
    void findFirstByOwnerAndRoleUsesSortOrderThenId() {
        MediaAsset later = asset("later", 20);
        MediaAsset first = asset("first", 10);
        MediaAsset sameSortLaterId = asset("same-sort-later-id", 10);
        jpaRepository().save(later);
        jpaRepository().save(first);
        jpaRepository().save(sameSortLaterId);

        MediaAsset result = repository.findFirstByOwnerAndRole(
                        MediaOwnerType.SKILL_VERSION,
                        9L,
                        MediaAssetRole.DEMO)
                .orElseThrow();

        assertThat(result.getSha256()).isEqualTo("first");
        assertThat(repository.findByOwnerAndRoleOrdered(MediaOwnerType.SKILL_VERSION, 9L, MediaAssetRole.DEMO))
                .extracting(MediaAsset::getSha256)
                .containsExactly("first", "same-sort-later-id", "later");
    }

    private MediaAsset asset(String hash, int sortOrder) {
        MediaAsset asset = new MediaAsset(
                MediaOwnerType.SKILL_VERSION,
                9L,
                MediaType.GIF,
                MediaAssetRole.DEMO,
                "media/skill_version/9/" + hash + ".gif",
                "image/gif",
                8,
                hash,
                "owner-1"
        );
        asset.setSortOrder(sortOrder);
        return asset;
    }

    @SuppressWarnings("unchecked")
    private JpaRepository<MediaAsset, Long> jpaRepository() {
        return (JpaRepository<MediaAsset, Long>) repository;
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    static class RepositoryTestConfig {
        @Bean
        MediaAssetJpaRepository mediaAssetJpaRepository(EntityManagerFactory entityManagerFactory) {
            EntityManager entityManager = SharedEntityManagerCreator.createSharedEntityManager(entityManagerFactory);
            return new JpaRepositoryFactory(entityManager).getRepository(MediaAssetJpaRepository.class);
        }
    }
}
