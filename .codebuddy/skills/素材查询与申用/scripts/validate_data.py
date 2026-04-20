#!/usr/bin/env python3
"""
素材查询与申用模块 - 数据验证脚本
用于验证IP数据和素材数据的完整性和格式正确性
"""

import json
import sys
import os

# IP数据必需字段
IP_REQUIRED_FIELDS = ['id', 'name', 'level', 'category', 'status', 'collectedMaterials']

# 素材数据必需字段
MATERIAL_REQUIRED_FIELDS = ['id', 'name', 'type', 'format', 'uploader', 'uploadTime']

# 有效的IP等级
VALID_LEVELS = ['S+', 'S', 'A', 'B']

# 有效的素材类型
VALID_MATERIAL_TYPES = ['video', 'audio', 'image', 'text', '3d']

# 有效的五要素标签
VALID_ELEMENT_TAGS = ['story', 'brand', 'music', 'model', 'character']

def validate_ip_data(data_path):
    """验证IP数据"""
    errors = []
    warnings = []
    
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        return [f"错误: 文件不存在 - {data_path}"], []
    except json.JSONDecodeError as e:
        return [f"错误: JSON格式错误 - {e}"], []
    
    # 检查品类
    expected_categories = ['tvSeries', 'animation', 'variety']
    for category in expected_categories:
        if category not in data:
            warnings.append(f"警告: 缺少品类 '{category}'")
            continue
            
        # 验证每个IP
        for i, ip in enumerate(data[category]):
            # 检查必需字段
            for field in IP_REQUIRED_FIELDS:
                if field not in ip:
                    errors.append(f"错误: [{category}][{i}] 缺少必需字段 '{field}'")
            
            # 验证IP等级
            if 'level' in ip and ip['level'] not in VALID_LEVELS:
                warnings.append(f"警告: [{category}][{i}] 无效的IP等级 '{ip.get('level')}'")
            
            # 检查ID唯一性
            if 'id' in ip:
                id_count = sum(1 for item in data[category] if item.get('id') == ip['id'])
                if id_count > 1:
                    errors.append(f"错误: [{category}] ID重复 '{ip['id']}'")
    
    return errors, warnings

def validate_material_data(data_path):
    """验证素材数据"""
    errors = []
    warnings = []
    
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        return [f"错误: 文件不存在 - {data_path}"], []
    except json.JSONDecodeError as e:
        return [f"错误: JSON格式错误 - {e}"], []
    
    all_ids = []
    
    for ip_name, materials in data.items():
        if not isinstance(materials, list):
            errors.append(f"错误: '{ip_name}' 的素材数据应为数组")
            continue
            
        for i, material in enumerate(materials):
            # 检查必需字段
            for field in MATERIAL_REQUIRED_FIELDS:
                if field not in material:
                    errors.append(f"错误: [{ip_name}][{i}] 缺少必需字段 '{field}'")
            
            # 验证素材类型
            if 'type' in material and material['type'] not in VALID_MATERIAL_TYPES:
                warnings.append(f"警告: [{ip_name}][{i}] 无效的素材类型 '{material.get('type')}'")
            
            # 验证五要素标签
            if 'elementTag' in material and material['elementTag'] not in VALID_ELEMENT_TAGS:
                warnings.append(f"警告: [{ip_name}][{i}] 无效的五要素标签 '{material.get('elementTag')}'")
            
            # 收集ID用于唯一性检查
            if 'id' in material:
                all_ids.append(material['id'])
    
    # 检查全局ID唯一性
    seen_ids = set()
    for mid in all_ids:
        if mid in seen_ids:
            errors.append(f"错误: 素材ID重复 '{mid}'")
        seen_ids.add(mid)
    
    return errors, warnings

def main():
    """主函数"""
    # 默认数据路径
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    module_path = os.path.join(base_path, 'modules', 'material-query')
    
    ip_data_path = os.path.join(module_path, 'data.json')
    material_data_path = os.path.join(module_path, 'material-detail-data.json')
    
    print("=" * 50)
    print("素材查询与申用模块 - 数据验证")
    print("=" * 50)
    
    # 验证IP数据
    print("\n📋 验证IP数据...")
    ip_errors, ip_warnings = validate_ip_data(ip_data_path)
    
    for error in ip_errors:
        print(f"  ❌ {error}")
    for warning in ip_warnings:
        print(f"  ⚠️ {warning}")
    
    if not ip_errors and not ip_warnings:
        print("  ✅ IP数据验证通过")
    
    # 验证素材数据
    print("\n📋 验证素材数据...")
    mat_errors, mat_warnings = validate_material_data(material_data_path)
    
    for error in mat_errors:
        print(f"  ❌ {error}")
    for warning in mat_warnings:
        print(f"  ⚠️ {warning}")
    
    if not mat_errors and not mat_warnings:
        print("  ✅ 素材数据验证通过")
    
    # 总结
    print("\n" + "=" * 50)
    total_errors = len(ip_errors) + len(mat_errors)
    total_warnings = len(ip_warnings) + len(mat_warnings)
    
    if total_errors == 0:
        print(f"✅ 验证完成: {total_warnings} 个警告, 0 个错误")
        return 0
    else:
        print(f"❌ 验证失败: {total_warnings} 个警告, {total_errors} 个错误")
        return 1

if __name__ == '__main__':
    sys.exit(main())
