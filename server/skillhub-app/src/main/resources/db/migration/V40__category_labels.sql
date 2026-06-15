-- V40: Seed 9 predefined category labels with English and Chinese translations

INSERT INTO label_definition (slug, type, visible_in_filter, sort_order, created_by)
VALUES
    ('frontend',         'RECOMMENDED', TRUE, 1, NULL),
    ('backend',          'RECOMMENDED', TRUE, 2, NULL),
    ('standards',        'RECOMMENDED', TRUE, 3, NULL),
    ('testing',          'RECOMMENDED', TRUE, 4, NULL),
    ('data-analysis',    'RECOMMENDED', TRUE, 5, NULL),
    ('automation',       'RECOMMENDED', TRUE, 6, NULL),
    ('research',         'RECOMMENDED', TRUE, 7, NULL),
    ('tool-integration', 'RECOMMENDED', TRUE, 8, NULL),
    ('other',            'RECOMMENDED', TRUE, 9, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'en', 'Frontend'        FROM label_definition WHERE slug = 'frontend'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'zh', '前端'            FROM label_definition WHERE slug = 'frontend'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'en', 'Backend'         FROM label_definition WHERE slug = 'backend'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'zh', '后端'            FROM label_definition WHERE slug = 'backend'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'en', 'Standards'       FROM label_definition WHERE slug = 'standards'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'zh', '规范'            FROM label_definition WHERE slug = 'standards'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'en', 'Testing'         FROM label_definition WHERE slug = 'testing'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'zh', '测试'            FROM label_definition WHERE slug = 'testing'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'en', 'Data Analysis'   FROM label_definition WHERE slug = 'data-analysis'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'zh', '数据分析'        FROM label_definition WHERE slug = 'data-analysis'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'en', 'Automation'      FROM label_definition WHERE slug = 'automation'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'zh', '自动化'          FROM label_definition WHERE slug = 'automation'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'en', 'Research'        FROM label_definition WHERE slug = 'research'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'zh', '调研'            FROM label_definition WHERE slug = 'research'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'en', 'Tool Integration' FROM label_definition WHERE slug = 'tool-integration'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'zh', '工具集成'        FROM label_definition WHERE slug = 'tool-integration'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'en', 'Other'           FROM label_definition WHERE slug = 'other'
ON CONFLICT (label_id, locale) DO NOTHING;

INSERT INTO label_translation (label_id, locale, display_name)
SELECT id, 'zh', '其他'            FROM label_definition WHERE slug = 'other'
ON CONFLICT (label_id, locale) DO NOTHING;
