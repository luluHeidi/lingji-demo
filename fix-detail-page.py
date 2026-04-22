#!/usr/bin/env python3
"""为每条审查单生成权益卡片详情数据（rightsInfos）"""
import json
import random
from datetime import datetime, timedelta

with open('modules/auth-management/data.json', encoding='utf-8') as f:
    data = json.load(f)

items = data['rightsReviewData']['items']

# 为每条审查单生成权益详情
for item in items:
    rights_ids = item.get('import_copr_rights_ids', [])
    if not rights_ids:
        continue
    
    rights_infos = []
    for idx, rid in enumerate(rights_ids):
        # 解析合同号中的版权ID部分
        parts = rid.split('-')
        contract_code = rid  # 合同号就是权益ID本身
        
        # 生成权益详情
        info = {
            'copr_rights_id': rid,
            'contract_codes': contract_code,
            'copyright_type': 'import' if idx == 0 else ('import' if random.random() > 0.3 else 'export'),
            'copyright_time_start': '2025-01-01',
            'copyright_time_end': '2027-12-31',
            'ip_authorize_right_external': random.choice([
                'authorized', 'not_authorized', 'pending', ''
            ]) if idx > 0 else 'pending',  # 第一条默认 pending
            'rights_type_label': '信息网络传播权' if idx % 2 == 0 else '二次创作权',
            'authorized_platforms': ['快手', '抖音'] if idx == 0 else ['快手'],
        }
        rights_infos.append(info)
    
    item['rights_infos'] = rights_infos

with open('modules/auth-management/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 统计
total_rights = sum(len(item.get('rights_infos', [])) for item in items)
print(f'OK: {len(items)} items, {total_rights} total rights cards')
