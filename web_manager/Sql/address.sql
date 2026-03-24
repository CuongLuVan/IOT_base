/*
 Navicat Premium Data Transfer

 Source Server         : iot_database
 Source Server Type    : MySQL
 Source Server Version : 80028
 Source Host           : 103.1.238.175:3306
 Source Schema         : hust_tech

 Target Server Type    : MySQL
 Target Server Version : 80028
 File Encoding         : 65001

 Date: 05/10/2022 07:46:39
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for address
-- ----------------------------
DROP TABLE IF EXISTS `group_company_detail`;
CREATE TABLE `group_company_detail`  (
  `group_company_detail_id` int(0) NOT NULL AUTO_INCREMENT,
  `company_id` int(0) NOT NULL,
  `group_company_id` int(0) NOT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`group_company_detail_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for advertisement_content
-- ----------------------------
DROP TABLE IF EXISTS `advertisement_content`;
CREATE TABLE `advertisement_content`  (
  `advertisement_id` int(0) NOT NULL AUTO_INCREMENT,
  `group_content_sub_id` int(0) NOT NULL,
  `store_product_id` int(0) NULL DEFAULT NULL,
  `group_file` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `filesave` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `content_img` varchar(1024) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `land_image` varchar(1024) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `set_to_fist` bigint(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`advertisement_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for advertisement_product
-- ----------------------------
DROP TABLE IF EXISTS `advertisement_product`;
CREATE TABLE `advertisement_product`  (
  `advertisement_product_id` int(0) NOT NULL AUTO_INCREMENT,
  `group_product_id` int(0) NOT NULL,
  `filesave` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `content_img` varchar(1024) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `land_image` varchar(1024) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `set_to_fist` bigint(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`advertisement_product_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for company
-- ----------------------------
DROP TABLE IF EXISTS `company`;
CREATE TABLE `company`  (
  `company_id` int(0) NOT NULL AUTO_INCREMENT,
  `companyname` varchar(100) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `adresss` varchar(100) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `phone` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `fax` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`company_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for company_of_customer
-- ----------------------------
DROP TABLE IF EXISTS `company_of_customer`;
CREATE TABLE `company_of_customer`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` int(0) NULL DEFAULT NULL,
  `permission_id` int(0) NULL DEFAULT NULL,
  `company_id` int(0) NULL DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `old_id` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8 COLLATE = utf8_vietnamese_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cost_transport
-- ----------------------------
DROP TABLE IF EXISTS `cost_transport`;
CREATE TABLE `cost_transport`  (
  `id_cost_transport` int(0) NOT NULL AUTO_INCREMENT,
  `value` int(0) NULL DEFAULT NULL,
  `content` varchar(128) CHARACTER SET utf8 COLLATE utf8_vietnamese_ci NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`id_cost_transport`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8 COLLATE = utf8_vietnamese_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for customer
-- ----------------------------
DROP TABLE IF EXISTS `customer`;
CREATE TABLE `customer`  (
  `customer_id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `token_reset` varchar(128) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `phone` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `avatar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `fullname` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `permission_id` int(0) UNSIGNED NULL DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `note` varchar(100) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` timestamp(0) NULL DEFAULT NULL,
  `updated_at` timestamp(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`customer_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1010003 CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for decentralization_access
-- ----------------------------
DROP TABLE IF EXISTS `decentralization_access`;
CREATE TABLE `decentralization_access`  (
  `decentralization_access_id` int(0) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_vietnamese_ci NULL DEFAULT NULL,
  `id_admin` int(0) NULL DEFAULT NULL,
  `id_member` int(0) NULL DEFAULT NULL,
  `enterprise_id` int(0) NULL DEFAULT NULL,
  `note` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`decentralization_access_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for detailbank
-- ----------------------------
DROP TABLE IF EXISTS `detailbank`;
CREATE TABLE `detailbank`  (
  `bank_id` int(0) NOT NULL AUTO_INCREMENT,
  `info` varchar(1024) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `bank` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`bank_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for enterprise
-- ----------------------------
DROP TABLE IF EXISTS `enterprise`;
CREATE TABLE `enterprise`  (
  `enterprise_id` int(0) NOT NULL AUTO_INCREMENT,
  `name` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `detail_info` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`enterprise_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for gro_pages_content
-- ----------------------------
DROP TABLE IF EXISTS `gro_pages_content`;
CREATE TABLE `gro_pages_content`  (
  `pages_content_id` int(0) NOT NULL AUTO_INCREMENT,
  `group_content_sub_id` int(0) NULL DEFAULT NULL,
  `group_file` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `filesave` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `title` varchar(128) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `content_img` varchar(1024) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `is_main_pages_id` int(0) NULL DEFAULT NULL,
  `set_to_fist` bigint(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`pages_content_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 598 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for gro_pages_customer_content
-- ----------------------------
DROP TABLE IF EXISTS `gro_pages_customer_content`;
CREATE TABLE `gro_pages_customer_content`  (
  `pages_customer_content_id` int(0) NOT NULL AUTO_INCREMENT,
  `group_content_customer_id` int(0) NULL DEFAULT NULL,
  `group_file` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `filesave` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `content_img` varchar(1024) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `set_to_fist` bigint(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`pages_customer_content_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for group_content
-- ----------------------------
DROP TABLE IF EXISTS `group_content`;
CREATE TABLE `group_content`  (
  `group_content_id` int(0) NOT NULL AUTO_INCREMENT,
  `group_content` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`group_content_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for group_content_sub
-- ----------------------------
DROP TABLE IF EXISTS `group_content_sub`;
CREATE TABLE `group_content_sub`  (
  `group_content_sub_id` int(0) NOT NULL AUTO_INCREMENT,
  `group_content` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `group_content_id` int(0) NULL DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`group_content_sub_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 46 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for group_customer_content
-- ----------------------------
DROP TABLE IF EXISTS `group_customer_content`;
CREATE TABLE `group_customer_content`  (
  `group_customer_id` int(0) NOT NULL AUTO_INCREMENT,
  `group_content` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`group_customer_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for mqtt_microservice
-- ----------------------------
DROP TABLE IF EXISTS `mqtt_microservice`;
CREATE TABLE `mqtt_microservice`  (
  `mqtt_microservice_id` int(0) NOT NULL AUTO_INCREMENT,
  `content` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `mqtt_pub` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `mqtt_sub` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `mqtt_user` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `mqtt_pass` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `mqtt_id` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`mqtt_microservice_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for mqtt_user
-- ----------------------------
DROP TABLE IF EXISTS `mqtt_user`;
CREATE TABLE `mqtt_user`  (
  `mqtt_user_id` int(0) NOT NULL AUTO_INCREMENT,
  `user_id` int(0) NULL DEFAULT NULL,
  `content` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `mqtt_pub` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `mqtt_sub` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `mqtt_user` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `mqtt_pass` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `mqtt_id` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NOT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`mqtt_user_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for oauthen2
-- ----------------------------
DROP TABLE IF EXISTS `oauthen2`;
CREATE TABLE `oauthen2`  (
  `id` int(0) NOT NULL AUTO_INCREMENT,
  `permission_id` int(0) NULL DEFAULT NULL,
  `userid` int(0) NULL DEFAULT NULL,
  `tocken` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `value_manifest` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `time_relase` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 57 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for oauthen2customer
-- ----------------------------
DROP TABLE IF EXISTS `oauthen2customer`;
CREATE TABLE `oauthen2customer`  (
  `id` int(0) NOT NULL AUTO_INCREMENT,
  `permission_id` int(0) NOT NULL,
  `customeid` int(0) NOT NULL,
  `tocken` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `value_manifest` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NOT NULL,
  `created_at` datetime(0) NOT NULL,
  `updated_at` datetime(0) NOT NULL,
  `id_created` int(0) NOT NULL,
  `id_updated` int(0) NOT NULL,
  `deleteflag` int(0) NOT NULL,
  `time_relase` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 73 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for payment_internal
-- ----------------------------
DROP TABLE IF EXISTS `payment_internal`;
CREATE TABLE `payment_internal`  (
  `id_payment_intenal` int(0) NOT NULL AUTO_INCREMENT,
  `value` int(0) NULL DEFAULT NULL,
  `type` int(0) NULL DEFAULT NULL,
  `note` varchar(255) CHARACTER SET utf8 COLLATE utf8_vietnamese_ci NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`id_payment_intenal`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8 COLLATE = utf8_vietnamese_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for payment_transport
-- ----------------------------
DROP TABLE IF EXISTS `payment_transport`;
CREATE TABLE `payment_transport`  (
  `id_payment_transport` int(0) NOT NULL AUTO_INCREMENT,
  `value` int(0) NULL DEFAULT NULL,
  `content` varchar(128) CHARACTER SET utf8 COLLATE utf8_vietnamese_ci NULL DEFAULT NULL,
  `id_cost_transport` int(0) NULL DEFAULT NULL,
  `id_transport` int(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`id_payment_transport`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8 COLLATE = utf8_vietnamese_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for payment_type
-- ----------------------------
DROP TABLE IF EXISTS `payment_type`;
CREATE TABLE `payment_type`  (
  `id_payment_type` int(0) NOT NULL AUTO_INCREMENT,
  `content` varchar(128) CHARACTER SET utf8 COLLATE utf8_vietnamese_ci NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`id_payment_type`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8 COLLATE = utf8_vietnamese_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for permission
-- ----------------------------
DROP TABLE IF EXISTS `permission`;
CREATE TABLE `permission`  (
  `permission_id` int(0) NOT NULL AUTO_INCREMENT,
  `content` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`permission_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for product
-- ----------------------------
DROP TABLE IF EXISTS `product`;
CREATE TABLE `product`  (
  `product_id` int(0) NOT NULL AUTO_INCREMENT,
  `company_id` int(0) NULL DEFAULT NULL,
  `product_group_id` int(0) NULL DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `detail` text CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL,
  `image` text CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL,
  `store` int(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`product_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 60 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for product_back
-- ----------------------------
DROP TABLE IF EXISTS `product_back`;
CREATE TABLE `product_back`  (
  `buyproduct_id` int(0) NOT NULL AUTO_INCREMENT,
  `product_id` int(0) NULL DEFAULT NULL,
  `quantity` int(0) NULL DEFAULT NULL,
  `KM` int(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`buyproduct_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for product_buy
-- ----------------------------
DROP TABLE IF EXISTS `product_buy`;
CREATE TABLE `product_buy`  (
  `buyproduct_id` int(0) NOT NULL AUTO_INCREMENT,
  `customer_id` int(0) NULL DEFAULT NULL,
  `selled_id` int(0) NULL DEFAULT NULL,
  `KM` int(0) NULL DEFAULT NULL,
  `status` int(0) NULL DEFAULT NULL,
  `Total` int(0) NULL DEFAULT NULL,
  `note` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `name` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `address` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`buyproduct_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 26 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for product_buy_detail
-- ----------------------------
DROP TABLE IF EXISTS `product_buy_detail`;
CREATE TABLE `product_buy_detail`  (
  `id_buy_detail` int(0) NOT NULL AUTO_INCREMENT,
  `buyproduct_id` int(0) NULL DEFAULT NULL,
  `image_id` int(0) NULL DEFAULT NULL,
  `quantity` int(0) NULL DEFAULT NULL,
  `KM` int(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`id_buy_detail`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 30 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for product_buy_return
-- ----------------------------
DROP TABLE IF EXISTS `product_buy_return`;
CREATE TABLE `product_buy_return`  (
  `product_buy_return_id` int(0) NOT NULL,
  `buyproduct_id` int(0) NULL DEFAULT NULL,
  `content` varchar(255) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `status` int(0) NULL DEFAULT NULL,
  `cost_confirm` int(0) NULL DEFAULT NULL,
  `user_comfirm` int(0) NULL DEFAULT NULL,
  `customer_id` int(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`product_buy_return_id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for product_group
-- ----------------------------
DROP TABLE IF EXISTS `product_group`;
CREATE TABLE `product_group`  (
  `product_group_id` int(0) NOT NULL AUTO_INCREMENT,
  `product_group_content` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`product_group_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for product_image
-- ----------------------------
DROP TABLE IF EXISTS `product_image`;
CREATE TABLE `product_image`  (
  `image_id` int(0) NOT NULL AUTO_INCREMENT,
  `product_id` int(0) NULL DEFAULT NULL,
  `name_image_detail` varchar(100) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `image_info_detail` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `cost_detail` int(0) NULL DEFAULT NULL,
  `cost_real` int(0) NULL DEFAULT NULL,
  `promotion` varchar(128) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`image_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 59 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for product_lost
-- ----------------------------
DROP TABLE IF EXISTS `product_lost`;
CREATE TABLE `product_lost`  (
  `stord_id` int(0) NOT NULL AUTO_INCREMENT,
  `image_id` int(0) UNSIGNED NULL DEFAULT NULL,
  `company_id` int(0) NULL DEFAULT NULL,
  `content` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `number` int(0) NULL DEFAULT NULL,
  `contain` int(0) NULL DEFAULT NULL,
  `expridate` datetime(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`stord_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for product_pages
-- ----------------------------
DROP TABLE IF EXISTS `product_pages`;
CREATE TABLE `product_pages`  (
  `product_pages_id` int(0) NOT NULL AUTO_INCREMENT,
  `product_id` int(0) NULL DEFAULT NULL,
  `filesave` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`product_pages_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 24 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for product_store
-- ----------------------------
DROP TABLE IF EXISTS `product_store`;
CREATE TABLE `product_store`  (
  `store_product_id` int(0) NOT NULL AUTO_INCREMENT,
  `product_id` int(0) NULL DEFAULT NULL,
  `company_id` int(0) NULL DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `image_id` int(0) NULL DEFAULT NULL,
  `number` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `contain` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `expridate` datetime(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`store_product_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 48 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for return_service
-- ----------------------------
DROP TABLE IF EXISTS `return_service`;
CREATE TABLE `return_service`  (
  `bill_service_id` int(0) NOT NULL AUTO_INCREMENT,
  `customer_id` int(0) NULL DEFAULT NULL,
  `service_id` int(0) NULL DEFAULT NULL,
  `value` int(0) NULL DEFAULT NULL,
  `bank` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `detail_bank` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `content` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`bill_service_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for service
-- ----------------------------
DROP TABLE IF EXISTS `service`;
CREATE TABLE `service`  (
  `service_id` int(0) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `image` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `cost` int(0) NULL DEFAULT NULL,
  `downloads` int(0) NULL DEFAULT NULL,
  `service_group_id` int(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`service_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for service_bill
-- ----------------------------
DROP TABLE IF EXISTS `service_bill`;
CREATE TABLE `service_bill`  (
  `bill_service_id` int(0) NOT NULL AUTO_INCREMENT,
  `customer_id` int(0) NULL DEFAULT NULL,
  `service_id` int(0) NULL DEFAULT NULL,
  `value` int(0) NULL DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`bill_service_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for service_charging
-- ----------------------------
DROP TABLE IF EXISTS `service_charging`;
CREATE TABLE `service_charging`  (
  `bill_service_id` int(0) NOT NULL AUTO_INCREMENT,
  `customer_id` int(0) NULL DEFAULT NULL,
  `service_id` int(0) NULL DEFAULT NULL,
  `value` int(0) NULL DEFAULT NULL,
  `bank` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `detail_bank` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `content` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`bill_service_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for service_group
-- ----------------------------
DROP TABLE IF EXISTS `service_group`;
CREATE TABLE `service_group`  (
  `service_group_id` int(0) NOT NULL AUTO_INCREMENT,
  `image` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `company_id` int(0) NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`service_group_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 11 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for service_pages
-- ----------------------------
DROP TABLE IF EXISTS `service_pages`;
CREATE TABLE `service_pages`  (
  `service_pages_id` int(0) NOT NULL AUTO_INCREMENT,
  `service_group_id` int(0) NULL DEFAULT NULL,
  `filesave` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`service_pages_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for social_shop
-- ----------------------------
DROP TABLE IF EXISTS `social_shop`;
CREATE TABLE `social_shop`  (
  `social_shop_id` int(0) NOT NULL AUTO_INCREMENT,
  `name_shop` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `product_id` int(0) NULL DEFAULT NULL,
  `link` varchar(512) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`social_shop_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for stock_buy
-- ----------------------------
DROP TABLE IF EXISTS `stock_buy`;
CREATE TABLE `stock_buy`  (
  `stock_buy_id` int(0) NOT NULL AUTO_INCREMENT,
  `stock_id` int(0) NULL DEFAULT NULL,
  `customer_buy` int(0) NULL DEFAULT NULL,
  `number` int(0) NULL DEFAULT NULL,
  `cost` int(0) NULL DEFAULT NULL,
  `user_approved_id` int(0) NULL DEFAULT NULL,
  `note` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`stock_buy_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for stock_info_aaa
-- ----------------------------
DROP TABLE IF EXISTS `stock_info_aaa`;
CREATE TABLE `stock_info_aaa`  (
  `date` datetime(0) NOT NULL,
  `open` float NULL DEFAULT NULL,
  `high` float NULL DEFAULT NULL,
  `low` float NULL DEFAULT NULL,
  `close` float NULL DEFAULT NULL,
  `volume` int(0) NULL DEFAULT NULL
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for stock_name
-- ----------------------------
DROP TABLE IF EXISTS `stock_name`;
CREATE TABLE `stock_name`  (
  `stock_id` int(0) NOT NULL AUTO_INCREMENT,
  `stockname` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `company` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `note` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`stock_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for stock_sale
-- ----------------------------
DROP TABLE IF EXISTS `stock_sale`;
CREATE TABLE `stock_sale`  (
  `stock_sale_id` int(0) NOT NULL AUTO_INCREMENT,
  `stock_id` int(0) NULL DEFAULT NULL,
  `customer_buy` int(0) NULL DEFAULT NULL,
  `number` int(0) NULL DEFAULT NULL,
  `cost` int(0) NULL DEFAULT NULL,
  `user_approved_id` int(0) NULL DEFAULT NULL,
  `note` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` datetime(0) NULL DEFAULT NULL,
  `updated_at` datetime(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`stock_sale_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `users_id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `phone` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `avatar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `fullname` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `permission_id` int(0) UNSIGNED NULL DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `note` varchar(100) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NULL DEFAULT NULL,
  `created_at` timestamp(0) NULL DEFAULT NULL,
  `updated_at` timestamp(0) NULL DEFAULT NULL,
  `id_created` int(0) NULL DEFAULT NULL,
  `id_updated` int(0) NULL DEFAULT NULL,
  `deleteflag` int(0) NULL DEFAULT NULL,
  `oldid` int(0) NULL DEFAULT NULL,
  PRIMARY KEY (`users_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 24 CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
