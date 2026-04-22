#!/usr/bin/env python3
"""重建 data.json — 按 M1/M2 规格升级数据结构"""
import json, os

DATA_PATH = os.path.join(os.path.dirname(__file__), 'modules/auth-management/data.json')

with open(DATA_PATH, encoding='utf-8') as f:
    data = json.load(f)

# ========== 升级审查单数据 ==========
items = data['rightsReviewData']['items']

for item in items:
    if item.get('task_type') == 'auth_review':
        item['task_type'] = 'authorization_review'
    elif item.get('task_type') == 'risk_review':
        item['task_type'] = 'risk_review_distribution'
    item.setdefault('xwq_status', '生效中')
    item.setdefault('online_status', '在线')
    item.setdefault('defect_type', '')
    item.setdefault('authorized_projects', [])

# 过滤掉 obsoleted 数据（如果有的话在前端也会过滤，这里保险起见标记）

# 追加5条新 task_type 数据
base_fields = {
    'rights_first_review_result': '', 'rights_first_review_defect_type': [],
    'rights_first_review_other_defect_type': '', 'rights_first_review_authorized_platforms': [],
    'rights_first_review_excluded_platforms': [], 'rights_first_review_by': '',
    'rights_first_review_at': '', 'rights_first_review_remark': '',
    'rights_second_review_result': '', 'rights_second_review_authorized_platforms': [],
    'rights_second_review_excluded_platforms': [], 'rights_second_review_defect_type': [],
    'rights_second_review_defect_disposal_method': '', 'rights_second_review_by': '',
    'rights_second_review_at': '', 'rights_second_review_remark': '',
    'import_copr_rights_id': '', 'import_copr_rights_ids': [],
    'defect_copy_rights_ids': [],
    'rights_third_review_result': '',
    'rights_third_review_authorized_platform_kuaishou': '',
    'rights_third_review_authorized_platform_douyin': '',
    'xwq_status': '生效中', 'online_status': '在线', 'defect_type': '',
    'authorized_projects': [], 'project_id': ''
}

new_items = [
    {**base_fields, 'audit_id': 'AUD-2026042101', 'copyright_id': 'bq2079101',
     'play_name': '赘婿第二季', 'play_name_alias': '赘婿2', 'play_category': '1',
     'task_type': 'risk_review_distribution', 'task_time': '2026-04-18 14:00:00',
     'audit_progress': 'rights_first_review', 'main_cid': 'mzc00200xyzabc',
     'cid_info': {'cid': 'mzc00200xyzabc', 'title': '赘婿第二季', 'hot_level': 'A'},
     'operator': 'system', 'created_at': '2026-04-18 14:00:00', 'updated_at': '2026-04-18 14:00:00'},
    {**base_fields, 'audit_id': 'AUD-2026042102', 'copyright_id': 'bq2079205',
     'play_name': '长相思第二季(风险)', 'play_name_alias': '长相思2', 'play_category': '1',
     'task_type': 'risk_review_defect', 'task_time': '2026-04-19 10:30:00',
     'audit_progress': 'rights_first_review', 'main_cid': 'mzc00200defghi',
     'cid_info': {'cid': 'mzc00200defghi', 'title': '长相思第二季', 'hot_level': 'S'},
     'operator': 'system', 'created_at': '2026-04-19 10:30:00', 'updated_at': '2026-04-19 10:30:00',
     'defect_type': '已分销二创'},
    {**base_fields, 'audit_id': 'AUD-2026042103', 'copyright_id': 'bq2079310',
     'play_name': '三体第三季(重审)', 'play_name_alias': '三体3', 'play_category': '1',
     'task_type': 'defect_reaudit', 'task_time': '2026-04-20 16:00:00',
     'audit_progress': 'rights_first_review', 'main_cid': 'mzc00200jklmno',
     'cid_info': {'cid': 'mzc00200jklmno', 'title': '三体第三季', 'hot_level': 'S'},
     'operator': 'system', 'created_at': '2026-04-20 16:00:00', 'updated_at': '2026-04-20 16:00:00',
     'xwq_status': '未知', 'is_reaudit': True, 'previous_audit_id': 'AUD-2026042015'},
    {**base_fields, 'audit_id': 'AUD-2026042104', 'copyright_id': 'bq2078890',
     'play_name': '蓝色星球中国篇(回收)', 'play_name_alias': '蓝色星球', 'play_category': '6',
     'task_type': 'manual_recovery', 'task_time': '2026-04-21 09:00:00',
     'audit_progress': 'rights_first_review', 'main_cid': 'mzc00200bsqcn',
     'cid_info': {'cid': 'mzc00200bsqcn', 'title': '蓝色星球中国篇', 'hot_level': 'B'},
     'operator': 'heidilulu', 'created_at': '2026-04-21 09:00:00', 'updated_at': '2026-04-21 09:00:00'},
    {**base_fields, 'audit_id': 'AUD-2026042105', 'copyright_id': 'bq2078890',
     'play_name': '蓝色星球中国篇(重授)', 'play_name_alias': '蓝色星球', 'play_category': '6',
     'task_type': 'manual_reauth', 'task_time': '2026-04-21 11:00:00',
     'audit_progress': 'rights_first_review', 'main_cid': 'mzc00200bsqcn',
     'cid_info': {'cid': 'mzc00200bsqcn', 'title': '蓝色星球中国篇', 'hot_level': 'B'},
     'operator': 'heidilulu', 'created_at': '2026-04-21 11:00:00', 'updated_at': '2026-04-21 11:00:00'}
]
items.extend(new_items)

# ========== 重建 projects ==========
data['projects'] = [
    {'id': 'PRJ-2026-001', 'name': '快手二创授权2026', 'rights_type': 'secondary_creation',
     'audit_mode': 'rolling', 'status': 'running', 'partner_name': '快手',
     'partner_contract_no': 'KS-2026-001', 'partner_contact': '张三',
     'category_scope': ['电视剧','电影','综艺','动漫','纪录片','少儿','微短剧'],
     'auth_window_start': '2026-01-01', 'auth_window_end': '2026-12-31',
     'daily_target': 3500, 'authorized_count': 3500, 'recovered_count': 12},
    {'id': 'PRJ-2026-002', 'name': '抖音二创授权2026', 'rights_type': 'secondary_creation',
     'audit_mode': 'rolling', 'status': 'running', 'partner_name': '抖音',
     'partner_contract_no': 'DY-2026-001', 'partner_contact': '李四',
     'category_scope': ['电视剧','电影','综艺','动漫'],
     'auth_window_start': '2026-01-15', 'auth_window_end': '2027-01-14',
     'daily_target': 2000, 'authorized_count': 1850, 'recovered_count': 5},
    {'id': 'PRJ-2026-003', 'name': '酷狗彩铃授权', 'rights_type': 'distribution',
     'audit_mode': 'one_time', 'status': 'running', 'partner_name': '酷狗',
     'partner_contract_no': 'KG-2026-001', 'partner_contact': '王五',
     'category_scope': ['电视剧','电影'],
     'auth_window_start': '2026-03-01', 'auth_window_end': '2026-09-30',
     'authorized_count': 120, 'recovered_count': 0},
    {'id': 'PRJ-2026-004', 'name': '小红书二创合作', 'rights_type': 'secondary_creation',
     'audit_mode': 'rolling', 'status': 'configuring', 'partner_name': '小红书',
     'partner_contract_no': '', 'partner_contact': '赵六',
     'category_scope': ['电视剧','综艺'],
     'auth_window_start': '2026-06-01', 'auth_window_end': '2027-05-31',
     'authorized_count': 0, 'recovered_count': 0},
    {'id': 'PRJ-2025-018', 'name': '梧桐稳智合作', 'rights_type': 'comprehensive',
     'audit_mode': 'one_time', 'status': 'archived', 'partner_name': '梧桐稳智',
     'partner_contract_no': 'WT-2025-018', 'partner_contact': '钱七',
     'category_scope': ['电视剧','电影','动漫'],
     'auth_window_start': '2025-06-01', 'auth_window_end': '2025-12-31',
     'authorized_count': 85, 'recovered_count': 3},
    {'id': 'PRJ-2026-005', 'name': 'B站播控授权', 'rights_type': 'broadcast',
     'audit_mode': 'rolling', 'status': 'suspended', 'partner_name': 'B站',
     'partner_contract_no': 'BL-2026-001', 'partner_contact': '孙八',
     'category_scope': ['动漫','纪录片'],
     'auth_window_start': '2026-02-01', 'auth_window_end': '2026-12-31',
     'daily_target': 500, 'authorized_count': 320, 'recovered_count': 2}
]

with open(DATA_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"OK: items={len(items)}, projects={len(data['projects'])}")
