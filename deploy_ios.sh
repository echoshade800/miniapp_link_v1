#!/bin/bash

# 从package.json中获取version字段
VERSION=$(grep '"version"' package.json | cut -d '"' -f4)

NAME=$(grep '"name"' package.json | cut -d '"' -f4)

# 检查是否成功获取版本号
if [ -z "$VERSION" ]; then
  echo "错误：无法从package.json中获取version字段"
  exit 1
fi

# 定义压缩文件名
ZIP_FILE="ios_${VERSION}.zip"

# 压缩ios目录下的所有文件
echo "正在压缩文件到 ${ZIP_FILE}..."
zip -r "$ZIP_FILE" ios/*

# 检查压缩是否成功
if [ $? -ne 0 ]; then
  echo "错误：压缩文件失败"
  exit 1
fi

# 上传到S3
echo "正在上传 ${ZIP_FILE} 到S3..."
aws s3 cp "$ZIP_FILE" "s3://vsa-bucket-public-new/miniapps/${NAME}/"

# 检查上传是否成功
if [ $? -ne 0 ]; then
  echo "错误：上传到S3失败"
  exit 1
fi
rm "$ZIP_FILE"

echo "部署成功！版本: https://vsa-bucket-public-new.s3.amazonaws.com/miniapps/${NAME}/ios_${VERSION}.zip"

# 提取名称并赋值给变量
MODULE_NAME=$(sed -e 's#//.*##' -e ':a' -e '/\/\*/{N;ba' -e '}' -e 's#/\*.*\*/##g' index.tsx | \
grep "AppRegistry.registerComponent" | \
sed -n "s/.*registerComponent('\\([^']*\\)'.*/\\1/p")

node update_monster_config.cjs ${NAME} ${MODULE_NAME} https://vsa-bucket-public-new.s3.amazonaws.com/miniapps/${NAME}/ios_${VERSION}.zip
