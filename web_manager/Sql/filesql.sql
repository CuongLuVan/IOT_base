-- phpMyAdmin SQL Dump
-- version 4.8.3
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th5 14, 2022 lúc 04:46 AM
-- Phiên bản máy phục vụ: 10.1.36-MariaDB
-- Phiên bản PHP: 7.2.11

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `hust_tech`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `address`
--

CREATE TABLE `address` (
  `addr_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `contactPhoneNumber` varchar(20) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `streetaddr` varchar(100) DEFAULT NULL,
  `postCode` varchar(12) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `advertisement_content`
--

CREATE TABLE `advertisement_content` (
  `advertisement_id` int(11) NOT NULL,
  `group_content_sub_id` int(11) NOT NULL,
  `group_file` varchar(50) DEFAULT NULL,
  `filesave` varchar(100) DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf8 DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf8 DEFAULT NULL,
  `content_img` varchar(1024) CHARACTER SET utf8 DEFAULT NULL,
  `store_product_id` int(11) NOT NULL,
  `set_to_fist` bigint(20) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `advertisement_content`
--

INSERT INTO `advertisement_content` (`advertisement_id`, `group_content_sub_id`, `group_file`, `filesave`, `title`, `content`, `content_img`, `store_product_id`, `set_to_fist`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 1, 'group_file', 'storeHtml/suportAd2.html', 'làm quen airen', 'làm quen airen', 'http://103.130.212.210:80/uploads/datas/1641700008937-95259119_169906151135190_4798438433477361664_n.png', 20, 0, '2021-07-25 22:01:34', '2021-07-25 22:01:34', 1, 1, 0, 0),
(2, 2, 'group_file', 'storeHtml/suportAd1.html', 'làm quen airen', 'làm quen airen', 'http://103.130.212.210:80/uploads/datas/1641700008937-95259119_169906151135190_4798438433477361664_n.png', 19, 0, '2021-07-25 22:02:36', '2021-07-25 22:02:36', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `company`
--

CREATE TABLE `company` (
  `company_id` int(11) NOT NULL,
  `companyname` varchar(50) NOT NULL,
  `adresss` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `fax` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `company`
--

INSERT INTO `company` (`company_id`, `companyname`, `adresss`, `phone`, `fax`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, '1', '1', '1', '2', '2021-08-11 19:58:10', '2021-08-11 20:01:27', 0, 1, 1, 0),
(2, '1', '1', '1', '1', '2021-08-11 19:58:03', '2021-08-11 19:58:10', 1, 1, 1, 1),
(3, 'abc', 'hà bài', '098856', '222', '2021-08-11 20:13:40', '2021-08-11 20:13:40', 1, 1, 0, 0),
(4, '1âsas', '1', '0988732723', '1', '2021-08-22 14:52:07', '2021-08-22 14:52:12', 0, 13, 0, 0),
(5, 'con lau', '1', '1', '1', '2021-08-15 10:31:16', '2021-08-22 14:52:07', 1, 13, 0, 4),
(6, 'âsassas', 's?', '0323843834', '2323', '2022-03-23 23:00:02', '2022-03-23 23:00:02', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `customer`
--

CREATE TABLE `customer` (
  `customer_id` int(20) UNSIGNED NOT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_reset` varchar(128) COLLATE utf8_unicode_ci DEFAULT NULL,
  `phone` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fullname` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `permission_id` int(10) UNSIGNED DEFAULT NULL,
  `address` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `note` varchar(100) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `id_created` int(11) DEFAULT NULL,
  `id_updated` int(11) DEFAULT NULL,
  `deleteflag` int(11) DEFAULT NULL,
  `oldid` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=DYNAMIC;

--
-- Đang đổ dữ liệu cho bảng `customer`
--

INSERT INTO `customer` (`customer_id`, `username`, `email`, `password`, `token_reset`, `phone`, `avatar`, `fullname`, `permission_id`, `address`, `note`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(2, 'luvancuong0105@gmail.com', 'luvancuong0105@gmail.com', '$2a$12$.D931Y6grtuLHjHq8ybWMeibg/35clYEWZKwYJJ/BitWsHXKMXMtC', 'llllllll', '+84389992137', 'llllllllll', 'Lu van', 1, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'ggggg', '2021-09-26 16:41:44', '2021-09-26 16:41:44', 0, 0, 0, 0),
(10, 'levanhuud@gmail.com', 'levanhuu@gmail.com1', '$2a$12$.D931Y6grtuLHjHq8ybWMeibg/35clYEWZKwYJJ/BitWsHXKMXMtC', NULL, '+84389392137', 'http://127.0.0.1:3000/uploads/datas/1650903369508-phanbiet.png', 'Lu van', NULL, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'đsdsds', '2022-04-25 16:16:19', '2022-04-25 16:16:19', 0, 0, 0, NULL),
(11, 'levanhu2u@gmail.com', 'levanhuu2@gmail.com1', '$2a$12$.D931Y6grtuLHjHq8ybWMeibg/35clYEWZKwYJJ/BitWsHXKMXMtC', NULL, '+84389592137', 'http://127.0.0.1:3000/uploads/datas/1650980885746-techhust.png', 'Lu van', NULL, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'samle', '2022-04-26 13:48:26', '2022-04-26 13:48:26', 0, 0, 0, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `decentralization_access`
--

CREATE TABLE `decentralization_access` (
  `decentralization_access_id` int(11) NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `id_admin` int(11) DEFAULT NULL,
  `id_member` int(11) DEFAULT NULL,
  `enterprise_id` int(11) DEFAULT NULL,
  `note` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `detailbank`
--

CREATE TABLE `detailbank` (
  `bank_id` int(11) NOT NULL,
  `info` varchar(1024) DEFAULT NULL,
  `bank` varchar(20) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `detailbank`
--

INSERT INTO `detailbank` (`bank_id`, `info`, `bank`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'ax', 'azx', '2021-08-11 08:03:19', '2021-08-11 08:03:23', 0, 1, 1, 0),
(2, 'ax', 'ax', '2021-08-11 08:03:12', '2021-08-11 08:03:19', 1, 1, 1, 1),
(3, 'a', 'a', '2021-08-11 08:09:05', '2021-08-11 08:10:22', 1, 1, 1, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `enterprise`
--

CREATE TABLE `enterprise` (
  `enterprise_id` int(11) NOT NULL,
  `name` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `detail_info` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `enterprise`
--

INSERT INTO `enterprise` (`enterprise_id`, `name`, `detail_info`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, '1', '2', '2021-08-11 07:19:33', '2021-08-11 07:29:31', 0, 1, 1, NULL),
(2, '1', '1', '2021-08-11 07:19:21', '2021-08-11 07:19:33', 1, 1, 1, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `group_content`
--

CREATE TABLE `group_content` (
  `group_content_id` int(11) NOT NULL,
  `group_content` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `group_content`
--

INSERT INTO `group_content` (`group_content_id`, `group_content`, `title`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'Công nghệ', 'Công nghệ mới ', '2021-06-15 00:00:00', '2021-06-10 00:00:00', 0, 0, 0, 0),
(2, 'Tài liệu', 'Tài liệu ', '2021-06-15 00:00:00', '2021-06-10 00:00:00', 0, 0, 0, 0),
(3, 'Giáo trình ', 'giáo trình ', '2021-06-15 00:00:00', '2021-06-10 00:00:00', 0, 0, 0, 0),
(4, 'Công cụ', 'Công cụ ', '2021-06-15 00:00:00', '2021-06-10 00:00:00', 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `group_content_sub`
--

CREATE TABLE `group_content_sub` (
  `group_content_sub_id` int(11) NOT NULL,
  `group_content` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `group_content_id` int(11) NOT NULL,
  `title` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `group_content_sub`
--

INSERT INTO `group_content_sub` (`group_content_sub_id`, `group_content`, `group_content_id`, `title`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'Công nghệ mới ', 1, 'Công nghệ mới ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(2, 'IT/AI', 1, 'Điện tử viễn thông ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(3, 'Điện tử', 1, 'Điện tử máy tính ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(4, 'Cơ khí', 1, 'Điện tử y sinh ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(5, 'Đời sống', 1, 'Đời sống', '2021-12-14 00:00:00', '2021-12-14 00:00:00', 1, 1, 0, 0),
(6, 'Tin giả', 1, 'Tin giả', '2021-12-14 00:00:00', '2021-12-14 00:00:00', 1, 1, 0, 0),
(7, 'tuyển dụng', 1, 'tuyển dụng', '2022-01-20 00:00:00', '2022-01-19 00:00:00', 1, 1, 0, 0),
(21, 'Toán/Vật lý', 2, 'điện tử cơ bản ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(22, 'Lập trình', 2, 'Lập trình ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(23, 'Điện tử', 2, 'Điện tử viễn thông ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(24, 'Cơ khí', 2, 'Điện tử máy tính ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(25, 'Đồ án', 2, 'Điện tử y sinh ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(26, 'Kỹ năng', 2, 'Kỹ năng', '2021-08-18 00:00:00', '2021-08-18 00:00:00', 1, 1, 0, 0),
(31, 'Toán/Vật lý', 3, 'điện tử cơ bản ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(32, 'Lập trình', 3, 'Lập trình ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(33, 'Điện tử', 3, 'Điện tử viễn thông ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(34, 'Cơ khí', 3, 'Điện tử máy tính ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(41, 'Chuyển đổi vật lý', 4, 'Chuyển đổi vật lý ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(42, 'Công cụ kinh tế', 4, 'Công cụ kinh tế ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(43, 'công cụ xử lý ảnh', 4, 'công cụ xử lý ảnh ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(44, 'Công cụ design', 4, 'Công cụ design ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0),
(45, 'công cụ IOT', 4, 'công cụ IOT ', '2021-06-16 00:00:00', '2021-06-16 00:00:00', 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `group_customer_content`
--

CREATE TABLE `group_customer_content` (
  `group_customer_id` int(11) NOT NULL,
  `group_content` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `gro_pages_content`
--

CREATE TABLE `gro_pages_content` (
  `pages_content_id` int(11) NOT NULL,
  `group_content_sub_id` int(11) NOT NULL,
  `group_file` varchar(50) DEFAULT NULL,
  `filesave` varchar(100) DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf8 DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf8 DEFAULT NULL,
  `content_img` varchar(1024) CHARACTER SET utf8 DEFAULT NULL,
  `is_main_pages_id` int(11) NOT NULL,
  `set_to_fist` bigint(20) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `gro_pages_content`
--

INSERT INTO `gro_pages_content` (`pages_content_id`, `group_content_sub_id`, `group_file`, `filesave`, `title`, `content`, `content_img`, `is_main_pages_id`, `set_to_fist`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(5, 21, 'group_file', 'storeHtml/fileYiIyeuT83kLX0FVbP2uD1625070724114.html', 'vi du', 'không rỗ', 'http://localhost:3000/uploads/datas/1625069820079-anh13.jpg', 0, 0, '2021-06-30 23:32:04', '2021-06-30 23:32:04', 1, 1, 0, 0),
(6, 1, 'group_file', 'storeHtml/filerigUa24JrEfHFjtGSxgV1626537985174.html', 'công nghệ 1 xxxx', 'không rỗ xxxx', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 1, '2021-06-30 23:33:07', '2021-07-17 23:06:25', 1, 1, 0, 0),
(7, 1, 'group_file', 'storeHtml/fileMwMciSt1yKxN1jxcsrDA1625070797905.html', 'công nghệ 2', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:33:17', '2021-06-30 23:33:17', 1, 1, 0, 0),
(8, 2, 'group_file', 'storeHtml/file95faRzHr0fMaz6BCf4EN1625070806525.html', 'công nghệ 22', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:33:26', '2021-06-30 23:33:26', 1, 1, 0, 0),
(9, 3, 'group_file', 'storeHtml/filetZHYpPgtisiWzypXldO11625070810340.html', 'công nghệ 22', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:33:30', '2021-06-30 23:33:30', 1, 1, 0, 0),
(10, 3, 'group_file', 'storeHtml/filej13fow55xGe6UbIaOdoD1625070812345.html', 'công nghệ 22', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:33:32', '2021-06-30 23:33:32', 1, 1, 0, 0),
(11, 4, 'group_file', 'storeHtml/fileeVxSBAwqlvyDwtslt8oe1625070819435.html', 'công nghệ 12', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:33:39', '2021-06-30 23:33:39', 1, 1, 0, 0),
(12, 4, 'group_file', 'storeHtml/filePxLbfuycGa2ygD6PRJG31625070824963.html', 'công nghệ 13', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:33:44', '2021-06-30 23:33:44', 1, 1, 0, 0),
(13, 5, 'group_file', 'storeHtml/filejckzPqDfU77wi2eP2epS1625070831582.html', 'công nghệ 132', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:33:51', '2021-06-30 23:33:51', 1, 1, 0, 0),
(14, 5, 'group_file', 'storeHtml/file9hZn3in17JswhX56O0qj1625070835664.html', 'công nghệ 15', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:33:55', '2021-06-30 23:33:55', 1, 1, 0, 0),
(15, 6, 'group_file', 'storeHtml/fileVed9OIxPpT79SEksTlqC1625070841086.html', 'công nghệ 15', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:34:01', '2021-06-30 23:34:01', 1, 1, 0, 0),
(16, 22, 'group_file', 'storeHtml/fileAlGLkClOVm3ZYhmxOl9q1625070848938.html', 'công nghệ 15', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:34:08', '2021-06-30 23:34:08', 1, 1, 0, 0),
(17, 24, 'group_file', 'storeHtml/fileYFhtjaOKPjS0gpVBtuWY1625070852175.html', 'công nghệ 15', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:34:12', '2021-06-30 23:34:12', 1, 1, 0, 0),
(18, 31, 'group_file', 'storeHtml/filek5jCuHMeW3ACAtWlOEby1625070859177.html', 'công nghệ 15ưqe', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:34:19', '2021-06-30 23:34:19', 1, 1, 0, 0),
(19, 31, 'group_file', 'storeHtml/file1lqtwx0Sso84YnN9ni8b1625070860924.html', 'công nghệ 15ưqe', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:34:20', '2021-06-30 23:34:20', 1, 1, 0, 0),
(20, 31, 'group_file', 'storeHtml/fileyksChPRMFHG8DlV2YBa91625070863747.html', 'công nghệ 15ưqe', 'không rỗ', 'http://localhost:3000/uploads/datas/1625070781786-2309.jpg', 0, 0, '2021-06-30 23:34:23', '2021-06-30 23:34:23', 1, 1, 0, 0),
(21, 41, 'tool', 'static/hk2_2021/AngleToRad/AngleToRad.html', 'angle sang rad', 'công cụ chuyển đổi radian sang độ', NULL, 0, 0, '2021-06-23 00:00:00', '2021-03-09 00:00:00', 1, 1, 0, 21),
(22, 22, 'group_file', 'storeHtml/fileWa5nW3M5EsIxZ71mH9Tg1626106996268.html', 'xsasas', 'aasasa', '', 0, 0, '2021-07-12 23:23:16', '2021-07-12 23:23:16', 1, 1, 0, 0),
(23, 1, 'group_file', 'storeHtml/fileh0KzqvjO4uwgloJWHSus1626495375358.html', 'Hướng dẫn phương pháp học lập trình cơ bản cho ngư', 'vi du', '', 0, 0, '2021-07-17 11:16:15', '2021-07-17 11:16:15', 1, 1, 0, 0),
(24, 1, 'group_file', 'storeHtml/fileOKzPzgVanfC0ISyT3uhz1626496822391.html', 'Hướng dẫn  hoc lap trinh', 'cong nghe moi', '', 0, 0, '2021-07-17 11:40:22', '2021-07-17 11:40:22', 1, 1, 0, 0),
(25, 1, 'group_file', 'storeHtml/fileUVurorm8gGTNVG1r2hRd1626496833138.html', 'Hướng dẫn  hoc lap trinh trinh 1', 'cong nghe moi', '', 0, 0, '2021-07-17 11:40:33', '2021-07-17 11:40:33', 1, 1, 0, 0),
(26, 1, 'group_file', 'storeHtml/filexin1FDWNhwvcjzZntDlR1626496835655.html', 'Hướng dẫn  hoc lap trinh trinh 1', 'cong nghe moi', '', 0, 0, '2021-07-17 11:40:35', '2021-07-17 11:40:35', 1, 1, 0, 0),
(27, 1, 'group_file', 'storeHtml/fileARvAIntA8ulEI2203Vxr1626496843281.html', 'Hướng dẫn  hoc lap trinh trinh 2', 'cong nghe moi', '', 0, 0, '2021-07-17 11:40:43', '2021-07-17 11:40:43', 1, 1, 0, 0),
(28, 1, 'group_file', 'storeHtml/fileOUS6Y6d9e3faXegZJZCl1626496849108.html', 'Hướng dẫn  hoc lap trinh trinh 3', 'cong nghe moi', '', 0, 0, '2021-07-17 11:40:49', '2021-07-17 11:40:49', 1, 1, 0, 0),
(29, 3, 'group_file', 'storeHtml/filetdpTAQpSxYDZVNdmkMwG1626496855702.html', 'Hướng dẫn  hoc lap trinh trinh 5', 'cong nghe moi', '', 0, 0, '2021-07-17 11:40:55', '2021-07-17 11:40:55', 1, 1, 0, 0),
(30, 1, 'group_file', 'storeHtml/filerEYG5pnvWKMoXdBZKRDy1626496861467.html', 'Hướng dẫn  hoc lap trinh trinh 6', 'cong nghe moi', '', 0, 0, '2021-07-17 11:41:01', '2021-07-17 11:41:01', 1, 1, 0, 0),
(31, 1, 'group_file', 'storeHtml/fileocMtXKvjZpmyOeh9FOei1626496868922.html', 'Hướng dẫn  hoc lap trinh trinh 7', 'cong nghe moi', '', 0, 0, '2021-07-17 11:41:08', '2021-07-17 11:41:08', 1, 1, 0, 0),
(32, 2, 'group_file', 'storeHtml/file1YkDka828NVbmZkKQKDb1626496900751.html', 'Hướng dẫn  hoc lap trinh viên thong 1', 'cong nghe viên thong 1', '', 0, 0, '2021-07-17 11:41:40', '2021-07-17 11:41:40', 1, 1, 0, 0),
(33, 2, 'group_file', 'storeHtml/filePSzoJcmdkd52Q31Ffimr1626496913723.html', 'Hướng dẫn  hoc lap trinh viên thong 2', 'cong nghe viên thong 2', '', 0, 0, '2021-07-17 11:41:53', '2021-07-17 11:41:53', 1, 1, 0, 0),
(34, 2, 'group_file', 'storeHtml/fileMfKhjFtnSEd0I73k4Vgl1626497802630.html', 'Hướng dẫn  hoc lap trinh viên thong 3', 'cong nghe viên thong 3', '', 0, 0, '2021-07-17 11:56:42', '2021-07-17 11:56:42', 1, 1, 0, 0),
(35, 2, 'group_file', 'storeHtml/file85AbHeR7IfcB0WycjyNg1626497810507.html', 'Hướng dẫn  hoc lap trinh viên thong 4', 'cong nghe viên thong 4', '', 0, 0, '2021-07-17 11:56:50', '2021-07-17 11:56:50', 1, 1, 0, 0),
(36, 2, 'group_file', 'storeHtml/fileK34LblqXhWThF0NlXwlO1626497844970.html', 'Hướng dẫn  hoc lap trinh viên thong 5', 'cong nghe viên thong 5', '', 0, 0, '2021-07-17 11:57:24', '2021-07-17 11:57:24', 1, 1, 0, 0),
(37, 2, 'group_file', 'storeHtml/fileE2PZtafQAbUhruyRRUlJ1626503219223.html', '0 cách tự học lập trình đơn giản', '0 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-17 13:26:59', '2021-07-17 13:26:59', 1, 1, 0, 0),
(38, 2, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', '10 cách tự học lập trình đơn giản', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-17 13:28:13', '2021-07-17 13:28:13', 1, 1, 0, 0),
(39, 3, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', '10 cách tự học lập trình đơn giản', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(40, 3, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'đua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(41, 3, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(42, 3, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(43, 3, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(44, 3, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(45, 4, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(46, 4, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(47, 4, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(48, 4, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(49, 4, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(50, 5, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(51, 5, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(52, 5, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(53, 6, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(54, 6, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(55, 6, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(56, 6, 'group_file', 'storeHtml/filecVK1FcA46z7YwfFi2Yr11632643266380.html', 'ua bài viết này các bạn xxxs', '10 cách tự học lập trình đơn giản xxss ss', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', -1, 2, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(57, 6, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(58, 6, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(59, 21, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(60, 21, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(61, 21, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(62, 21, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(63, 21, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(64, 21, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(65, 22, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(66, 22, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(67, 22, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(68, 22, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(69, 22, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(70, 22, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(71, 22, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(72, 22, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(73, 22, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(74, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(75, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(76, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(77, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(78, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(79, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(80, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(81, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(82, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(83, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(84, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(85, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(86, 23, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(87, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(88, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(89, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(90, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(91, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(92, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(93, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(94, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(95, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(96, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(97, 25, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(98, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(99, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(100, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(101, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(102, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(103, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(104, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(105, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(106, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(107, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(108, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(109, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(110, 26, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(111, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(112, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(113, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(114, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(115, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(116, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(117, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(118, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(119, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(120, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(121, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(122, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(123, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(124, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(125, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(126, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(127, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(128, 27, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(129, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(130, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(131, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(132, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(133, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(134, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(135, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(136, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(137, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(138, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(139, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(140, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(141, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(142, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(143, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(144, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(145, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(146, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(147, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(148, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(149, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(150, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(151, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(152, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(153, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(154, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(155, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(156, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(157, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(158, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(159, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(160, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(161, 28, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(162, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(163, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(164, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(165, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(166, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(167, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(168, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(169, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(170, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(171, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(172, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(173, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(174, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(175, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(176, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(177, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(178, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(179, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(180, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(181, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(182, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(183, 31, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(184, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(185, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(186, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(187, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(188, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(189, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(190, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(191, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0);
INSERT INTO `gro_pages_content` (`pages_content_id`, `group_content_sub_id`, `group_file`, `filesave`, `title`, `content`, `content_img`, `is_main_pages_id`, `set_to_fist`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(192, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(193, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(194, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(195, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(196, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(197, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(198, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(199, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(200, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(201, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(202, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(203, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(204, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(205, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(206, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(207, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(208, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(209, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(210, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(211, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(212, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(213, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(214, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(215, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(216, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(217, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(218, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(219, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(220, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(221, 32, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(222, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(223, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(224, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(225, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(226, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(227, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(228, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(229, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(230, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(231, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(232, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(233, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(234, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(235, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(236, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(237, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(238, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(239, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(240, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(241, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(242, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(243, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(244, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(245, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(246, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(247, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(248, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(249, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(250, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(251, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(252, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(253, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(254, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(255, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(256, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(257, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(258, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(259, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(260, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(261, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(262, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(263, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(264, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(265, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(266, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(267, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(268, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(269, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(270, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(271, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(272, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(273, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(274, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(275, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(276, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(277, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(278, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(279, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(280, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(281, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(282, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(283, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(284, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(285, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(286, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(287, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(288, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(289, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(290, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(291, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(292, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(293, 33, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(294, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(295, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(296, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(297, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(298, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(299, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(300, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(301, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(302, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(303, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(304, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(305, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(306, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(307, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(308, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(309, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(310, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(311, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(312, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(313, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(314, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(315, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(316, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(317, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(318, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(319, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(320, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(321, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(322, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(323, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(324, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(325, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(326, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(327, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(328, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(329, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(330, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(331, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(332, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(333, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(334, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(335, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(336, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(337, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(338, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(339, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(340, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(341, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(342, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(343, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(344, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(345, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(346, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(347, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(348, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(349, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(350, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(351, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(352, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(353, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(354, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(355, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(356, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(357, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(358, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(359, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(360, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(361, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(362, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(363, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(364, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(365, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(366, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(367, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(368, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(369, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(370, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(371, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0);
INSERT INTO `gro_pages_content` (`pages_content_id`, `group_content_sub_id`, `group_file`, `filesave`, `title`, `content`, `content_img`, `is_main_pages_id`, `set_to_fist`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(372, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(373, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(374, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(375, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(376, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(377, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(378, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(379, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(380, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(381, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(382, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(383, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(384, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(385, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(386, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(387, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(388, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(389, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(390, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(391, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(392, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(393, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(394, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(395, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(396, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(397, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(398, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(399, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(400, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(401, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(402, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(403, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(404, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(405, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(406, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(407, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(408, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(409, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(410, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(411, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(412, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(413, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(414, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(415, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(416, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(417, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(418, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(419, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(420, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(421, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(422, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(423, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(424, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(425, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(426, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(427, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(428, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(429, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(430, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(431, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(432, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(433, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(434, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(435, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(436, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(437, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(438, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(439, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(440, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(441, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(442, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(443, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(444, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(445, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(446, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(447, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(448, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(449, 34, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(450, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(451, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(452, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(453, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(454, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(455, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(456, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(457, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(458, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(459, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(460, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(461, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(462, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(463, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(464, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(465, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(466, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(467, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(468, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(469, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(470, 35, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(471, 36, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(472, 36, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(473, 36, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(474, 36, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(475, 36, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(476, 36, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(477, 36, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(478, 36, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(479, 36, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(480, 36, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(481, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(482, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(483, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(484, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(485, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(486, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(487, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(488, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(489, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(490, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(491, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(492, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(493, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(494, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(495, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(496, 37, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(497, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(498, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(499, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(500, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(501, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(502, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(503, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(504, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(505, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(506, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(507, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(508, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(509, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(510, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(511, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(512, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(513, 38, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'ua bài viết này các bạn ', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 0, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(514, 6, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'Bài 1', '10 cách tự học lập trình đơn giản s1', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 56, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(515, 6, 'group_file', 'storeHtml/filerigUa24JrEfHFjtGSxgV1626537985174.html', 'Bài 2', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 56, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(516, 6, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'Bài 3', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 56, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(517, 6, 'group_file', 'storeHtml/filerigUa24JrEfHFjtGSxgV1626537985174.html', 'Bài 4', '10 cách tự học lập trình đơn giản', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 56, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(518, 6, 'group_file', 'storeHtml/filexdGDkE5xAAmvhmWoxP0g1626503293014.html', 'Bài 5', '10 cách tự học lập trình đơn giản 1', 'http://localhost:3000/uploads/datas/1626502591224-converted.jpg', 56, 0, '2021-07-12 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(519, 1, 'group_file', 'storeHtml/fileKd5iGRnXMfu0SB5ta6H71630836622668.html', 'ZXCXZC', 'XZCZXC', '', 0, 0, '2021-09-05 17:10:22', '2021-09-05 17:10:22', 13, 13, 0, 0),
(520, 1, 'group_file', 'storeHtml/filedbapxkad0C8nvxaCWlfE1630855722102.html', '', '', '', 0, 0, '2021-09-05 22:28:42', '2021-09-05 22:28:42', 13, 13, 0, 0),
(521, 1, 'group_file', 'storeHtml/filetTPKMwNM0GbP0yjC4UMG1630891491188.html', '', '', '', 0, 0, '2021-09-06 08:24:51', '2021-09-06 08:24:51', 13, 13, 0, 0),
(522, 1, 'group_file', 'storeHtml/fileViFR9yDI1d6I2MCeYuDG1630939686754.html', 'Tiêu đề bài viết', 'Tiêu đề bài viết', 'http://127.0.0.1:3000/uploads/datas/1630939583362-Untitled9.png', 0, 0, '2021-09-06 21:48:06', '2021-09-06 21:48:06', 13, 13, 0, 0),
(523, 1, 'group_file', 'storeHtml/filefd8iNptB1LmZU09roGA91630947689194.html', 'xxxxxxxxxxxxxxxxxxxx', 'xxxxxxx', 'http://127.0.0.1:3000/uploads/datas/1630947669308-Untitled9.png', 0, 0, '2021-09-07 00:01:29', '2021-09-07 00:01:29', 13, 13, 0, 0),
(524, 1, 'group_file', 'storeHtml/fileQTtDjPHloJdwqfdR0z8b1630949249102.html', 'https://www.youtube.com/watch?v=0VC6euBtKkk', 'https://www.youtube.com/watch?v=0VC6euBtKkk', 'http://127.0.0.1:3000/uploads/datas/1630949176033-Untitled9.png', 0, 0, '2021-09-07 00:27:29', '2021-09-07 00:27:29', 13, 13, 0, 0),
(525, 1, 'group_file', 'storeHtml/filegSrhwfhQbnEhhScIiXTF1630949651632.html', 'https://www.youtube.com/watch?v=0VC6euBtKkk', 'https://www.youtube.com/watch?v=0VC6euBtKkk', 'http://127.0.0.1:3000/uploads/datas/1630949637760-Untitled7.png', 0, 0, '2021-09-07 00:34:11', '2021-09-07 00:34:11', 13, 13, 0, 0),
(526, 1, 'group_file', 'storeHtml/filecVK1FcA46z7YwfFi2Yr11632643266380.html', 'dddddddd', 'ddd', 'http://127.0.0.1:3000/uploads/datas/1632643176100-71f2c32c128be6d5bf9a.jpg', 0, 0, '2021-09-26 15:01:06', '2021-09-26 15:01:06', 1, 1, 0, 0),
(527, 42, 'static/hk2_2021/cal-student/index.html', 'static/hk2_2021/cal-student/index.html', 'Calculator Grade For Student', 'Calculator Grade For Student', 'http://localhost:3000/static/hk2_2021/cal-student/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 9),
(528, 42, 'static/hk2_2021/cal-student-12/index.html', 'static/hk2_2021/cal-student-12/index.html', 'Calculator Grade For Student In School', 'Calculator Grade For Student  In School', 'http://localhost:3000/static/hk2_2021/cal-student-12/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 9),
(529, 41, 'static/hk2_2021/Chuyendoicoso/Chuyendoicoso.html', 'static/hk2_2021/Chuyendoicoso/Chuyendoicoso.html', 'Chuyển đổi cơ số', 'Chuyển đổi cơ số', '/static/hk2_2021/convert.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 9),
(530, 41, 'static/hk2_2021/ConvertingTable/demo3.html', 'static/hk2_2021/ConvertingTable/demo3.html', 'Chuyển đổi đơn vị', 'Bảng chuyển đổi', '/static/hk2_2021/convert.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 9),
(531, 41, 'static/hk2_2021/DemoCalculator/index.html', 'static/hk2_2021/DemoCalculator/index.html', 'Máy tính', 'Demo caculator', '/static/hk2_2021/DemoCalculator/caculator.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 9),
(532, 41, 'static/hk2_2021/DemoChangeMoney/index.html', 'static/hk2_2021/DemoChangeMoney/index.html', 'Chuyển đổi tiền tệ', 'Chuyển đổi tiền tệ', 'http://localhost:3000/static/DemoChangeMoney/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(533, 41, 'static/hk2_2021/DemoChangeTemperature/index.html', 'static/hk2_2021/DemoChangeTemperature/index.html', 'Chuyển đổi Nhiệt độ', 'Chuyển đổi nhiệt đọ', '/static/hk2_2021/DemoChangeTemperature/nhietdo.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 0),
(534, 41, 'static/hk2_2021/DuonglichsangAmlich/calendar.html', 'static/hk2_2021/DuonglichsangAmlich/calendar.html', 'Dương lịch sang âm lịch', 'Dương lịch sang âm lịch', 'http://localhost:3000/static/DuonglichsangAmlich/calendar.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(535, 42, 'static/hk2_2021/electricity_money_and_tax/index.ht', 'static/hk2_2021/electricity_money_and_tax/index.html', 'Chuyển đổi Nhiệt độ', 'Tính toán thuế', 'http://localhost:3000/static/electricity_money_and_tax/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(536, 41, 'static/hk2_2021/expression/index.html', 'static/hk2_2021/expression/index.html', 'Chuyển đổi Nhiệt độ', 'Chuyển đổi nhiệt đọ', '/static/hk2_2021/DemoChangeTemperature/nhietdo.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(537, 41, 'static/hk2_2021/fourier-series/index.html', 'static/hk2_2021/fourier-series/index.html', 'Biến đổi fourier', 'Biến đổi fourier', 'http://localhost:3000/static/fourier-series/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(538, 44, 'static/hk2_2021/functionGraph/index.html', 'static/hk2_2021/functionGraph/index.html', 'Chức năng vẽ', 'Chức năng vẽ ', 'http://localhost:3000/static/functionGraph/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(539, 41, 'static/hk2_2021/Giang/index.html', 'static/hk2_2021/Giang/index.html', 'Convert', 'Convert ', 'http://localhost:3000/static/Giang/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(540, 42, 'static/hk2_2021/gold/index.html', 'static/hk2_2021/gold/index.html', 'gold', 'Khối lượng vàng sang chỉ vàng ,cây vàng', '/static/hk2_2021/convert.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 0),
(541, 42, 'static/hk2_2021/gold-dollar/a.html', 'static/hk2_2021/gold-dollar/a.html', 'gold - dola', 'gold - dola', 'http://localhost:3000/static/gold-dollar/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(542, 41, 'static/hk2_2021/hinhchunhat/index.html', 'static/hk2_2021/hinhchunhat/index.html', 'Tính diện tích', 'Tính diện tích', '/static/hk2_2021/the-tich/thetich.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 0),
(543, 43, 'static/hk2_2021/image_color_to_black/a.html', 'static/hk2_2021/image_color_to_black/a.html', 'ảnh màu sang đen trắng', 'Công cụ đơn giản biến đổi ảnh màu sang đen trắng', '/static/hk2_2021/image_procesing1.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 0),
(544, 43, 'static/hk2_2021/ImageProcessing/index.html', 'static/hk2_2021/ImageProcessing/index.html', 'xử lý ảnh', 'xử lý ảnh ,tách ảnh sang R, G, B , lọc trung vị ,bộ lọc sobel và  một số bộ lọc khác', '/static/hk2_2021/image_procesing.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 0),
(545, 42, 'static/hk2_2021/loan-bank/index.html', 'static/hk2_2021/loan-bank/index.html', 'Tính toán lãi suất ngân hàng', 'Tính toán lãi suất ngân hàng tích lũy theo năm', '/static/hk2_2021/convert.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 0),
(546, 42, 'static/hk2_2021/OrderWeb/index.html', 'static/hk2_2021/OrderWeb/index.html', 'OrderWeb', 'OrderWeb ', 'http://localhost:3000/static/OrderWeb/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(547, 41, 'static/hk2_2021/polygon-area/index.html', 'static/hk2_2021/polygon-area/index.html', 'image color to black', 'Diện tích đa giác', 'http://localhost:3000/static/polygon-area/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(548, 45, 'static/hk2_2021/text-to-voice/VB-GN.html', 'static/hk2_2021/text-to-voice/VB-GN.html', 'Chuyển đổi  văn bản tiếng anh sang giọng nói ', 'text-to-voice', '/static/hk2_2021/text-voice.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 0),
(549, 41, 'static/hk2_2021/the-tich/index.html', 'static/hk2_2021/the-tich/index.html', 'tính thể tích các hình đặc biệt', 'the-tich', '/static/hk2_2021/the-tich/thetich.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 0, 0),
(550, 42, 'static/hk2_2021/TinhTienMachIn/index.html', 'static/hk2_2021/TinhTienMachIn/index.html', 'TinhTienMachIn', 'TinhTienMachIn', 'http://localhost:3000/static/TinhTienMachIn/demo.jpg', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(551, 42, 'static/hk2_2021/tinhtiennuoc/TTN.html', 'static/hk2_2021/tinhtiennuoc/TTN.html', 'tinhtiennuoc', 'tinhtiennuoc', 'http://localhost:3000/static/tinhtiennuoc/TTN.png', 0, 0, '2021-11-09 00:00:00', '2021-11-03 00:00:00', 1, 1, 1, 0),
(552, 41, '1', 'static/hk2_2021/Giang/mV.html', 'Khối lượng  thể tích', 'Bạn có thể chuyển đổi giữa khối lượng và thể tích của một vài chất.', '/static/hk2_2021/Giang/assets/img/khoi-luong-rieng.jpg', 0, 0, '2021-06-15 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(553, 41, '1', 'static/hk2_2021/Giang/convertV.html', 'Đo thể tích chất lỏng', 'Bạn có một lượng chất lỏng chưa biết thể tích ?Tôi sẽ giúp bạn', '/static/hk2_2021/Giang/assets/img/water.jpg', 0, 0, '2021-06-15 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(554, 41, '1', 'static/hk2_2021/Giang/convertA.html', 'Đo áp suất', 'Các đơn vị áp suất qua lại với nhau như nào nhỉ ?', '/static/hk2_2021/Giang/assets/img/Pressure.png', 0, 0, '2021-06-15 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(555, 41, '1', 'static/hk2_2021/Giang/convertP.html', 'Đo công suất', 'Hãy để tôi giúp bạn chuyển đổi các đơn vị về công nhé.', '/static/hk2_2021/Giang/assets/img/nhat-tin-logistics-25.jpg', 0, 2, '2021-06-15 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0);
INSERT INTO `gro_pages_content` (`pages_content_id`, `group_content_sub_id`, `group_file`, `filesave`, `title`, `content`, `content_img`, `is_main_pages_id`, `set_to_fist`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(556, 1, 'group_file', 'storeHtml/filegVnhXtgCm1LHVa45mYYo1638807201968.html', 'xzXZX', 'zXxxxxxxxxxxxxxxxxZXz', 'http://127.0.0.1:3000/uploads/datas/1638806333206-Untitled3.png', 0, 0, '2021-12-06 23:13:21', '2021-12-06 23:13:21', 1, 1, 0, 0),
(557, 43, 'static/tool/removebg.html', 'static/tool/removebg.html', 'Công cụ xóa ảnh nền', 'Bạn muốn tách vật thể ra khỏi ảnh nền mà không muốn sử dụng photoshop. Chúng tôi xin cung cấp công cụ tách ảnh nền nhanh chóng tiện lợi nhằm đáp ứng nhu cầu chỉnh sửa ảnh của bạn', '/static/tool/removebg.png', 0, 0, '2021-12-07 00:00:00', '2021-12-28 00:00:00', 1, 1, 0, 0),
(558, 43, 'static/tool/vtracer.html', 'static/tool/vtracer.html', 'ảnh png sang ảnh vector svg', 'Vector được tạo thành từ thuật toán thể hiện đặc tính có hướng của nét vẽ , còn bitmap là sắp xếp các điểm ảnh có trật tự. Do hai mô hình này khác nhau nên quá trình chuyển đổi ảnh bitmap sang vector khá rắc rối. Công cụ này nhằm giúp bạn đơn giản hóa việc chuyển đổi ảnh bitmap sang vector .', '/static/tool/vtracer.png', 0, 0, '2021-12-07 00:00:00', '2021-12-28 00:00:00', 1, 1, 0, 0),
(559, 7, 'group_file', 'static/recruitment/newwave/index.html', 'vi du', 'không rỗ', 'http://localhost:3000/uploads/datas/1625069820079-anh13.jpg', 0, 0, '2021-06-30 23:32:04', '2021-06-30 23:32:04', 1, 1, 0, 0),
(560, 7, 'test', 'static/recruitment/educa/index.html', 'educa', 'educae', 'http://localhost:3000/uploads/datas/1625069820079-anh13.jpg', 0, 0, '2022-01-09 00:00:00', '2022-01-10 00:00:00', 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `gro_pages_customer_content`
--

CREATE TABLE `gro_pages_customer_content` (
  `pages_customer_content_id` int(11) NOT NULL,
  `group_content_customer_id` int(11) NOT NULL,
  `group_file` varchar(50) DEFAULT NULL,
  `filesave` varchar(100) DEFAULT NULL,
  `title` varchar(50) CHARACTER SET utf8 DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf8 DEFAULT NULL,
  `content_img` varchar(1024) CHARACTER SET utf8 DEFAULT NULL,
  `set_to_fist` bigint(20) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `mqtt_microservice`
--

CREATE TABLE `mqtt_microservice` (
  `mqtt_microservice_id` int(11) NOT NULL,
  `content` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `mqtt_pub` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `mqtt_sub` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `mqtt_user` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `mqtt_pass` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `mqtt_id` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `mqtt_microservice`
--

INSERT INTO `mqtt_microservice` (`mqtt_microservice_id`, `content`, `mqtt_pub`, `mqtt_sub`, `mqtt_user`, `mqtt_pass`, `mqtt_id`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'w', 'ư', 'ư', 'ư', 'ư', 'R', '2021-08-09 21:57:17', '2021-08-09 22:05:29', 0, 1, 1, NULL),
(2, 'w', 'ư', 'ư', 'ư', 'ư', 'ư', '2021-08-09 21:25:38', '2021-08-09 21:57:17', 1, 1, 1, 1),
(3, '1asassad', '1asassad', '1asassad', '1asassad', '1asassad', '1asassad', '2021-08-22 14:36:44', '2021-08-22 14:36:44', 13, 13, 0, NULL),
(4, '1asassad chiu', '1asassad', '1asassad', '1asassad', '1asassad', '1asassad', '2021-08-22 14:38:34', '2021-08-22 14:38:34', 0, 13, 0, NULL),
(5, '1asassad', '1asassad', '1asassad', '1asassad', '1asassad', '1asassad', '2021-08-22 14:37:07', '2021-08-22 14:37:11', 13, 13, 1, NULL),
(6, '1asassad', '1asassad', '1asassad', '1asassad', '1asassad', '1asassad', '2021-08-22 14:36:54', '2021-08-22 14:38:34', 13, 13, 1, 4),
(7, 'abcdefaaa', 'abcdefaaa', 'abcdefaaa', 'abcdefaaa', 'abcdefaaa', 'abcdefaaa', '2021-08-22 16:47:01', '2021-08-22 16:47:01', 15, 15, 0, NULL),
(8, '21212', '121212', '121212', '21212', '111111111111111', '121221', '2021-08-22 16:51:16', '2021-08-22 16:51:16', 0, 17, 0, NULL),
(9, '21212', '121212', '121212', '21212', '21212', '121221', '2021-08-22 16:49:06', '2021-08-22 16:51:16', 17, 17, 1, 8),
(10, 'âsadasdasd', 'âsadasdasd', 'âsadasdasd', 'âsadasdasd', 'âsadasdasd', 'âsadasdasd', '2021-08-22 21:13:32', '2021-08-22 21:13:44', 18, 18, 1, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `mqtt_user`
--

CREATE TABLE `mqtt_user` (
  `mqtt_user_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `mqtt_pub` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `mqtt_sub` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `mqtt_user` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `mqtt_pass` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `mqtt_id` varchar(40) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `mqtt_user`
--

INSERT INTO `mqtt_user` (`mqtt_user_id`, `user_id`, `content`, `mqtt_pub`, `mqtt_sub`, `mqtt_user`, `mqtt_pass`, `mqtt_id`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(2, 1, 'luvancuong0105', 'p_luvancuong0105', 's_luvancuong0105', 'luvancuong0105', 'HLTxOqwV6Y', 'luvancuong0105', '2021-08-08 21:48:14', '2021-08-08 21:48:14', 0, 0, 0, NULL),
(3, 1, '1asassad', '1asassadaa', '1asassad', '1asassadâ ac2', '1asassad', '1asassad', '2021-08-22 14:49:37', '2021-08-22 14:49:37', 0, 13, 0, NULL),
(4, 1, '1asassad', '1asassad', '1asassad', '1asassad', '1asassad', '1asassad', '2021-08-22 14:37:27', '2021-08-22 14:37:33', 13, 13, 1, 3),
(5, 1, '1asassad', '1asassadaa', '1asassad', '1asassad', '1asassad', '1asassad', '2021-08-22 14:37:33', '2021-08-22 14:49:37', 0, 13, 1, 3),
(6, 16, 'aaaaa', 'aaaưqw', 'aaaa', 'aưqwqwqwwqw', 'ưqwqwqw', 'aưqwqw', '2022-03-23 23:52:08', '2022-03-23 23:52:08', 1, 1, 0, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `oauthen2`
--

CREATE TABLE `oauthen2` (
  `id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `userid` int(11) NOT NULL,
  `tocken` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `value_manifest` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `time_relase` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `oldid` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `oauthen2`
--

INSERT INTO `oauthen2` (`id`, `permission_id`, `userid`, `tocken`, `value_manifest`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `time_relase`, `oldid`) VALUES
(1, 1, 1, 'EufW2TlGFbkxyh3DVg4PoIBk1ABhiZNrfs1VKCUAmUzM5eGDUI9TwWRalzyoNrcIwmbwsIhyFl0ap4tSYNqeYp8N9TwoV5BhGXyywuVvG5LwBIywvwVOHSRng0tcivqbmaPeQcGyJ86EFyKKshJu4SGTMyRXx1CWgIVhKb4xr72VBQyB0eQxGUTNvZBUG0MFlSNq9UVp96TBmIkEDx5GOZWBXENx5CQQd4GClxs6x1KHU6XuS2g7NnQ1pgxvO9IU', '1', '2022-03-21 22:07:00', '2022-03-21 22:07:00', 1, 1, 0, '2022-03-22 15:07:00', NULL),
(2, 1, 1, 'oqKBqV6WX4k42CbLoGAWDzMaNmYNgCH3R6RlQy7PZnebFHGFISXVZGOwDcneZJmQSQjLpN0fbSK4kZr5jKb9iDMjTQlIbRKAUUcjlDy13i34V9wBY7TyyaO4YpxKv41ogpmLz2ZWJvEXZRxC42YUF3leDH4iSKTWydxJD515qW7QrvSHpng3OiAGxSObfm4LL9reWXmDhctiDjVGxxnuzWufselfCCAi8DMo13GBGe99l8gFw8JbXs1E1lmeI3lK', '1', '2022-03-23 01:18:01', '2022-03-23 01:18:01', 1, 1, 0, '2022-03-23 18:18:01', NULL),
(3, 1, 1, 'MWObec92VWwVNTVNTMwoWTfO0SMS90ZgkDbQgi9Bz19JeMw5mXx8nfR02oSpLl8eraokbviZ9JszOuD4gLbfr0qwx2o8TfHbGMZwPmOyEREuN4bsj7cN1d0zJ10nL0ZUWLv3UdIyXBzsVP8CB33M8ZSUFaT2bGx1ERGo2Ex7ONdDYxQnmswGtOuM5qzzbhyPG4raBGHAS1UK3wYreHo1PBHZOoQOZ9yTe06Ox8Qx5sApiRQOa8Jzg6nYTAoTX2gJ', '1', '2022-03-24 21:56:48', '2022-03-24 21:56:48', 1, 1, 0, '2022-03-25 14:56:48', NULL),
(4, 1, 1, 'AR0LyTwIarBCgdd2lzCXDSL1n2Sc2WAOy2Mxd51gVXfKZ0g4jAD0vehb0OXihzCAljL4lB9630mLW0B9j62fysUPmj4NdGIsoTlK3t3RX20o6Yrx5SxHLSTMK6M19m0noP4ZJ30sezkpwA9hEgWFBk38nX2TTbcbPN5vAZ46pFg10pLeSFE75AL7rJFpnzkQ2JKBEUqbkpyoGyz4s643lQThYIWqiDYnBOSb8qoId4gHv2lQ2e6qzBbRt4Y3vsWt', '1', '2022-03-25 22:17:51', '2022-03-25 22:17:51', 1, 1, 0, '2022-03-26 15:17:51', NULL),
(5, 1, 1, 'Avqhq4AmgLdojH2JKtJuO94JyMbsCFXZ1sOXdKFRJ5mgRoHHXY7crKGR3iS3eoONsmdrJWTE8PY7cQd1iUS4GPM0XQSWfPoMKQXI148iGSTyiVHZPzCyFf9DS858DRzcYEDWphIb2qSo0TFbZGE9o1bEjAd3qqxDJhCPSqLhaWlA6h0ywkXYV4tvHlzHBaOw49oZNyk1EzYKhbVpXNRyyyzbdyaT2oTsn1KIzppK2KyfWlre3L93KNHB8W2Go8t6', '1', '2022-03-26 22:18:28', '2022-03-26 22:18:28', 1, 1, 0, '2022-03-27 15:18:28', NULL),
(6, 2, 13, 'c8KPW9lIyqWXTNVTQfKsKFVv1I05RuCV9cgTzbz1hKDijnk3qnAc6xqjC3eNUM9JMj49cbab9J2QpCAMB9FzL4ticDpY6T0vJWDaYPhqv5ABYiieBfEbJ0jpT3tTwKmCFmnTxeKfXsheiMSH1R1oLpFZC8S5QjnNvwOFGNjvW4ZS8tjwluxqiYR9nlCEFILZTmsCe5g7QilhoZZSRZvf2gajvwgo9mlrOuyQNRDKPQlYm8ACaOyWqriX9pam9bfl', '13', '2022-04-17 21:50:59', '2022-04-17 21:50:59', 13, 13, 0, '2022-04-18 14:50:59', NULL),
(7, 2, 13, 'U3rk6teVIBLRY2OZKyxqlltWAVMSODehWvZmDx76tashO27tx1coH1Zk0tUaAlB5Fs3ohTgxpCTqpJFyzTizQ6o5mTyL2tZlQvlZfkEq3FgBJONuRzGtkhS7S4SIzRo8pGYXQMMKA5Wequy1Rv8GYzRWMLwjPW6QEuBKYpAB941lDnc95vlsbSUWc1clgpHljdfsQhhtzSAahXx8v3gRgY9wos3JZ4It4anLtUaBmU7k4VXkjc8vbYS3Pb9GvY59', '13', '2022-04-20 23:27:48', '2022-04-20 23:27:48', 13, 13, 0, '2022-04-21 16:27:48', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `oauthen2customer`
--

CREATE TABLE `oauthen2customer` (
  `id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `customeid` int(11) NOT NULL,
  `tocken` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `value_manifest` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `time_relase` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `oldid` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `oauthen2customer`
--

INSERT INTO `oauthen2customer` (`id`, `permission_id`, `customeid`, `tocken`, `value_manifest`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `time_relase`, `oldid`) VALUES
(1, 1, 1, 'xjzjR2IB4D0Jzxyb9YCPbqcUe9MC4KaidA8YmjHx2amwQM3bATfuVaGBzKVJs0QEdiQDgvgLr98ROJCsqHyCPWyWMYLyp82iYUqgKjEq4OLFdPzAy6OaTKiPgJSf8qjfoti4I530RkPXS5ML7FdMmLi0cTCXJmfhS8IuLqBsMCWciF06JzAVZZSVaVRDe3cLsxPgR7ziagLTUAndUzeNlY17R8nhgkD5B3gzkG6Xym966LjOaiyxhT03aw38qhQn', '1', '2021-08-14 14:20:06', '2021-08-14 14:20:06', 1, 1, 0, '2021-08-15 07:20:06', NULL),
(2, 1, 1, 'yk1jCU6OSdqbGs76GHeeAVTApHe3KFUx1MW4nzg3JXbcxhp6KpI7DC3yVaI8YIKHvmv32zVLQ8VClxuaGEIMPgHcgFCWyva7bJaegasfOW7Tmw2OpH8XgJGjoi2yPyUCUkj1MxX2Eop7PoKprMSMnJvY4E9AdnHORvS6NGS3GznGLnfVsMy46EGevupGfR0aRNBIVXwWDbTd0J5U2ageS19TUnsGVZkiUnxFOEiMzwusu72Zao73bWpEiG4JMO5A', '1', '2021-08-14 14:46:45', '2021-08-14 14:46:45', 1, 1, 0, '2021-08-15 07:46:45', NULL),
(3, 1, 1, 'khd85ooVXukO0ujSrenkEDJhGMT8IM4gtt3FSOoDwWbjYoFpvB1dNZxKOe3q7apFPWVturXQMszJWNSlkAUuegTeVK3ToDa0GO1e5CAvVT0cqRa4cgTnr9DkTz63draHTrwNN9o9sHgyzSaipLqMg95PILr24ouqQAit2JOIh8BJjIwZloSzAqm1BtKuDWFchf1ryfJTlhbto1yTIU89SQyCGneD2iWES2GdIrLuR1tPntTHB8zQz9Wr1rtl1a3Q', '1', '2021-08-14 14:46:54', '2021-08-14 14:46:54', 1, 1, 0, '2021-08-15 07:46:54', NULL),
(4, 1, 1, 'AhsIGQcOiHLAPxLO4CInACA8jXpWZNnb47njZUL2EXUWvdrjktr3BYrqXnyPckRiCCO6WmRryUFlh7MffaSR0DBOFkuvj9vXkbLalvvPrJsmYrUKm5RcFdN4Y8XfeGjPZiJ6g9DE6ksWEaErtBZoYpzvYZoJGXyFzC5qTSf3BFXPSzdXQTWwuxfquhTZmNVwWONEDzrgYFVrZVpdyCHSGrTFs1ucv1Jl6ijlmvU6e08ZYJg0U01P99tVT19bwKCN', '1', '2021-08-14 14:50:51', '2021-08-14 14:50:51', 1, 1, 0, '2021-08-15 07:50:51', NULL),
(5, 1, 1, 'mAX3y4yNULQttbcO8wyUcV7lEo1Hy0tnpw6pD7AqoI2d6OSea7DCvakCTDzUsrvwLoAIYEM6LkwgkykliBrk5LJ2aKUllkgw3t8dVMcq1reWs73ImQ74bNBYpWjaHKgk0muA4TY9qhH1UHJesWecoM8IORYhQRyaJTRagT5ldzA4wPytnQhmLnlNSiR5zLnQbPmEEcb7gPfPD6dHvplSo3RI0SHBSEHDa9CpGd6tG7GCpJgwpQgKO2BzVmRASbsb', '1', '2021-08-14 14:51:15', '2021-08-14 14:51:15', 1, 1, 0, '2021-08-15 07:51:15', NULL),
(6, 1, 2, 'ZgH75TJ9jjAjE5Fp3XMuZ5tFUdy1nDlwsDdNLaTgQXIi4xnHvEiJTKJFVUFOxHnJQXy02cn9iPFdzx5dOxEpZ69UcIeQdzaSPHx8uuPMVIWr4mn3V0L3HpLlnmKbdkuvXPKR1lGDYQXbaGXr63tBZAFvBCiLpzlNlndm34mpgsEekzGHp3Hh0KcnwVNsmZI5eDncS19iykMpoIQWeU5wImNHoOXAYt9bi5TgUYZFjzQJ4WPOYv0DiIotoQ8jF1Qh', '2', '2021-11-17 09:11:21', '2021-11-17 09:11:21', 2, 2, 0, '2021-11-18 02:11:21', NULL),
(7, 1, 2, 'EaRQ9RjnIo1YJ8lp4O8aFS3vozQDpidi5Hxrn1WEUxMQ1e7UjrWV1heTdf9UrWcscAGELqE0bdv4ob4cM97fYKZNYxoJPqPNPxtyAn9livd7Av4dC5jVpQ5IP5IUch6n0GqQS4tPBPrHWhKFY4sHhmwhGG3ZwpjH0djcUG3YAH7VtdnTm63EDwelTvfAVBSjgL8UCLoQh13sCwOrJezLMLD5JDon58UeELQ0etLhCccN1LYDfKM8dkJLfkkGYbu3', '2', '2021-12-02 14:38:28', '2021-12-02 14:38:28', 2, 2, 0, '2021-12-03 07:38:28', NULL),
(8, 1, 2, 'ShUH3c4YvUp9Ye8XE6IsdhoOehB5uNhAbMLaHWtRl6NNlT5mFEW8P1ziXskSxTSJsmhXdlPCHVHdmXirdcLIOn0v3viupLasc0UTAq4PDcU6ERcbrPDQ8YIKg0ntEwMFPHeMzwyIiutdo3pPVwsQ5izczZlEDKBIZpvq8P24JuFtulyOslcOIQE2XtNmx5iHz8PKhG1kCGLPwKdPyKY8rj5HseU9rXLrUW4HUzrb91Y70QYoQoeuU9a5hugFsS0F', '2', '2021-12-03 21:30:44', '2021-12-03 21:30:44', 2, 2, 0, '2021-12-04 14:30:44', NULL),
(9, 1, 2, 'zRa6xKSlUBUXr4sfnx8ty8oL2KhAgIvk32MD7AXyP8rICqz2ODA9v6EJG55zbW7uTi4DgREJa7Gz0bxa7XnxF2k3TaH3BzKSGgLiOEzj3cfvgCjsx8viCeifznsknpmLlslFYZKryd9zWh4js7E2noklFR3B8g1ZvMoCiUqzyC4zftfTy35N0FWaviChTxpHkTqQfJzLZkYerJEs1NXjyDnRQitIQFNxj8GLUIGIjxPyXRBytzLb0SuJFrir5idF', '2', '2022-02-10 00:01:00', '2022-02-10 00:01:00', 2, 2, 0, '2022-02-10 17:01:00', NULL),
(10, 2, 2, 'zpitum2GSnmYOlvZGe6NCCwXFi142CdOdwneGGUYMUJc5NqyI0E5NU7HlXJG0bxyytdoFlXKA0zjFugtbVIbqScB8xIevTAppcIOClTAv8vp6gddQtTUpdcx3ZyKzftzY2mheVqBzvj1bBcHKVpDqulwRnojh8ULdk5lqqJN3p71FOQnRd8i2EDx0Fzg7Yak1nHfvKvaaFidQtT4GWoj1Ws4N9GYFA6mRDYGP29iWJVXKHtftJayivHEjJqn4QgV', '2', '2022-03-27 17:04:41', '2022-03-27 17:04:41', 2, 2, 0, '2022-03-28 10:04:41', NULL),
(11, 2, 2, 'bOs6USDQkEMMUiJgZMh8JPgT96nIthyruFbyUqHxxs1yHLG4Hbeou7Wv4FXs8sizxkYj4O6aqDILjfdawQAnlS0xxXvAP1giqzHyHFOwE3cAIWhO34rPGwcHJz4pAHjhiGfyVW97UsQXlQ0e1tRjEhHfXqarJRpB5i9dTSykCakt51r9RNwAoopPPJDpOl2VpKiDDyxF7MnVhQIgwzg4e9KOZrF1t3529lVEk73YdORoXvUOp3PHFXAYz0aTtdJA', '2', '2022-03-27 17:11:22', '2022-03-27 17:11:22', 2, 2, 0, '2022-03-28 10:11:22', NULL),
(12, 2, 2, '12fttEHgEpEtRQUA7bHIGBvepfcnhe6NjUVtEpZA3led06rJB2fsUFmr4TKdfR4J7purvkRXxOFGZQe5ydoasC7ON0mhKD5oE8d962P3Z6K6kwSR3bNZyOkCJGDQvUBvzO7gco2qLnEMRYvOzILpkAQjO14ZV40288rEzXo53SgBejFjVwkoP66y82CLXHHJvIFpmB9UyRiqrMZls1H72AEFDn3aunWUhHyzeuxfZauHLZERA5sUTEcmyDyrBvuv', '2', '2022-03-27 17:16:11', '2022-03-27 17:16:11', 2, 2, 0, '2022-03-28 10:16:11', NULL),
(13, 2, 2, 'O54ZDpBTpEpVVkUoXq5m3kGbUqQ4jvGZNXkbHJwdAMNuJ8cv8gCLVB6rs6EJ88MOqJzNHJxPvdk80o5HXH3DkvgbCLxCHkXOSbp4cspLQrzp1VGmtv343v8oA5yBGG4DUWtz2e7H9oljTb1p11pUMzOv6u6MZQUfTTZFxVxf8ZmJQw7mGThiRZAA1GKZo3nqXoinoF33TK26WnUFmyFxCSkuOefFNH3vHo7KF2tQZtNel2UIu1OQpKaWC2DNbSSt', '2', '2022-03-27 17:18:01', '2022-03-27 17:18:01', 2, 2, 0, '2022-03-28 10:18:01', NULL),
(14, 2, 2, 'w0qoVjEBKCYB4KoIZMJTUcO1ukaqW100qjaxuDeHu9cGNejKk499ex5xEVbpbVaTn0PHQeIfxRQXg6x197f6hJpkWQeGDedDhav57LTHyclbAoP3LUah2s2IyfEo7iYqmZlEUSgVtMLdhv153EfQKNhpoRr97ytSRPEYjviN0SJ8oVqpnzfbNS3BOfRPFshYuTri2UIUEOL1hrq4dqJLwgWzJR0JxnbJyj9quumAXt2WD9IRetcM6TD7FAd5QsZV', '2', '2022-03-28 21:23:33', '2022-03-28 21:23:33', 2, 2, 0, '2022-03-29 14:23:33', NULL),
(15, 2, 2, '4CGp4c1rmHVP9IXANek6c7m4GNlassGZr9xx4K7MvPMOqkBwl5CxvU4J7KIB989nr2ZoVL3ms8ml6b8VqmL2q8AuClxyIq5wShvTuZul3HhO6o2d3Qp2nKauh76NeClswfN7IJhrMMDXFSsYClkoHwMSCzhqypLjwUfk1gdO1iH7ervDed7tMJEUDM0cEOq7eGiqDTWhShFrkAihTHWC93F7BqkY9MCVqbwvTRtDpaVSDbj6Ks4OurAWTflXR3zB', '2', '2022-03-29 21:14:04', '2022-03-29 21:14:04', 2, 2, 0, '2022-03-30 14:14:04', NULL),
(16, 2, 2, 'LDawxqGSu4unbavr3UFX76t6Rd9yzCoFladw76hOTf5XM6F4rVMOzq7BYINtRIWpO0wDtSVmeMsSlX9rlBHKxfndgid6Vi6pb8GCHu7Yk2nV40XnGdgLQpLWZyCNCGcZ2H9cGLv4ommtYcrKbgZVI2A4PrK8tUg55W3hBY1PYpBnSp5cU7bS7DczNxkb4V20mO1H7oLhLWMRYkx6kFlIoqkAqLKfmyqBKpV0AA95qLsSfWfBVokFRxAODbFXAXeh', '2', '2022-03-31 00:01:20', '2022-03-31 00:01:20', 2, 2, 0, '2022-03-31 17:01:20', NULL),
(17, 2, 2, 's779NXLBrXNpzSBwxG6OrBuE3F7MbW2tzzgon7yGYhAtNdyexmeapZivNrq6MQtb2dG2aZW6lSUer8ASxJjDnZwzBIVTiXDpJ5AxhPRSd3ZYEebLlGTKzq1KIoqvDvmzMf1vwXXdEKh9AJ04nDiCoXHDVdPsYxEwE7G7H2uS688WYPXef2WzB4CRT2hJQxboHLmmLJ4PxqmNm06CLBCVqHkK7QJvn6Iw9IQDtHrLlf0KOs0JfI578KB6xrGIrHt5', '2', '2022-04-01 01:07:50', '2022-04-01 01:07:50', 2, 2, 0, '2022-04-01 18:07:50', NULL),
(18, 2, 8, 'Mq9DK0aU0U4tub0wDehzNV93Tb04q7lk6KVWSZmYnmCQgNGjQNe8VYbDD9B2eqYXiVaLJCWqjopoEHFKmKFtEW9NQXvkDIMjNAZlc6JEVNACwKG5WyJx1xaPIR5PSphlY7UAydab2zD6mh9Esw2od7zBE12QK9tyaXiDfC82ZdFprHj9Wy4iys1GIysb7voRDt3ROm3CwtexWWLxAX35xvhKBPUDSB8mx2erBmi488dLj2DULkMmQc5ODuKdvYeW', '8', '2022-04-25 02:05:54', '2022-04-25 02:05:54', 8, 8, 0, '2022-04-25 19:05:54', NULL),
(19, 2, 9, '0eZwox7hT6QKGJyLkjtUSqSF8hoLaT82dMYFdfGyqH5uR3FeGxvRzBE3PPRGtb25o0YRDQulFfxRECKZ2RUEWPl3c5msA2Ofx1r701Lh2m91PeoZn2QYqFrwDcJCD4V3b5Uw9A9YZgLXw6nowSWms99D5OeU3Auvm8q3dRJ5S07kMPDJxBESILUOYW8UPJk6yqB0BwWLMgutlCfUCUAbwFUSyA0tkepBvi3tMs15H0L5bXfM9K3NFEvUD8cZIWZd', '9', '2022-04-25 22:59:51', '2022-04-25 22:59:51', 9, 9, 0, '2022-04-26 15:59:51', NULL),
(20, 2, 10, '9wk9ByjzWE7i8w0Ly7a95YepI7DyMZLpPRiaRFKX6Wvrx3rIj2IMNpzOJlZSRswk6OlTo4eov7kXEThujwdvfyYZZmJ81Qtb1lG8Ai9RxcDllObyBXsvwgECty8ohVnld22ZW3l1CrdV3Qy3yjkmIeJOp44FHOZPdPVFWH7LNX5QZXImV0gWr5p2ciYxrjf6a2YMu4Mvtb0UWthqgK5djbooMFi1e6WWAqm4e9JzOyt2RmleHXmr7MmGZsIxtn6w', '10', '2022-04-25 23:16:20', '2022-04-25 23:16:20', 10, 10, 0, '2022-04-26 16:16:20', NULL),
(21, 2, 10, '4De4Be0d31zNEAOzIgoFP92CjZKj2w5kVuJByNcX8SQsIhQSx0s785RACciRzVMJjviOTr72dALe6KkY657PsgrUyUH3K3hKq6zYqRKRcH4HEcESXyq1McQG59d4IsCc30uBXAF4DrAHfLzWMQYMtMIuDRSDiUDEMW7mGBAnZ6ZXJHhZkDMNHEYNo4T4w6ikU6Zr7oNVLXie45mivdEYriR4hhpxvRlMwOoULA2bAHOnkatxDXfx1JbWpdbec93E', '10', '2022-04-25 23:25:16', '2022-04-25 23:25:16', 10, 10, 0, '2022-04-26 16:25:16', NULL),
(22, 2, 10, 'DzuNYlCECmpQcBaaFWWGzryiFyjwqZ21KFk2ONP5CJr8GkEHJi4DiGJRJaLqNx3AcUQtO7gh121wFLM4ps59fz5ontTVKfrHYOLPvrh3MUidHTmGkEkKN5RBbzQxL7qCr2aEjDFnMiBGo7IXXT6c15dL8AWNVSoSmn1KQbGSxU72BcnUJhXz41NetsEcgdo7FVCsocpaBUdz3eNerjzOPgovv0aTOfMdAJbltXejkjUDlGElcHDFzPvQ1H7oIiDk', '10', '2022-04-25 23:25:45', '2022-04-25 23:25:45', 10, 10, 0, '2022-04-26 16:25:45', NULL),
(23, 2, 11, '1x1VEKrHAydzy8peX14dVf151XrrwLWHnIGZuucig302mpHpESPcaBz246LKrF50bPvrxuZNdlfjyQCcKseAMDX2HErpI836T2Nr9JqOfsjmS01K2Kl8yC2M4FYiTWTLjDSqnxxvOmROtUoJFTPjO1mjBwCIwkU3tpgT4HrKep7yJ2W9USFS8nkNh7PFdmlg1UYMSVpkOA2ghHP5kl0pwiC4n1R63rV6mwJPmz0D3MsfafhsgcPDz7PUlvgAftPY', '11', '2022-04-26 20:48:27', '2022-04-26 20:48:27', 11, 11, 0, '2022-04-27 13:48:27', NULL),
(24, 2, 11, 'jF5stcFyzjtGjfS9PQIqjWkoi5mglSgnGjUMe62XyvTDVbcI6GN9Ocd5arfJTEuAykG8o4qreJ6dLHdTb2F9nM5Ce2h1M4gi1YezC4IEFnYgtlzfdgZW6YYtpUCHR4e5RBXEcNXv8zTrpUGY8zostVCHk8agIiiodauT3K7NXmDRa8yfRAKV0Aj9OyTifKXluTSiAzEoUwhuBgTNkw3l1qkNEew1KRZsUVeHC6agW8LeRUkY0xZWXtbiq815J0X1', '11', '2022-04-26 22:26:58', '2022-04-26 22:26:58', 11, 11, 0, '2022-04-27 15:26:58', NULL),
(25, 2, 11, 'nDkQgLTAIR1zkVNPcIiOKScBgFFf27jQfJJSSaYCRh3OOjSas7qgzmu7myGRXmpVI4Eoip0XS2gAoWv1rB76swWWxvr77g8jheOt2cBrHhaWXyvJubccU4fdc5W2Cbl7Mz6l1L1RgdVhTmWSIaq0dpwjrAGDtFB2rD27WeRk4OFuozF77bGWrKIBqOrxx7EF9m5jj6Tyr3cwoSs5QYnTTpeMswaxtia3rh4sal3FH7hyY2iB0G7saqEmqbTT0E21', '11', '2022-04-26 22:27:52', '2022-04-26 22:27:52', 11, 11, 0, '2022-04-27 15:27:52', NULL),
(26, 2, 11, 'lkDntx8HbLtLZZfHygUz4VkELZ1t028kF8aLmsnacjAjTaUtR9GgGfRGKXys5mlQxiJoe3sKxn733OOITMIFWdXYYdbLKDGtrYzDJA6LaTVkgOMELFZlo9vu6RvXy0gRVDzHuBsgbyurfJG9gNKEY0LtjVeyCOPzTscB8WPinaHzoauD1Tkm53AqucXIoj4w2vijSih2j2DXrnv0Ca7ZARAek9KpQQdkQBt0Q14izhf17rpJIgXVY276mAFJibat', '11', '2022-04-26 22:28:40', '2022-04-26 22:28:40', 11, 11, 0, '2022-04-27 15:28:40', NULL),
(27, 2, 11, 'yQnjDNKjkQ0AlNRvdHmtK7t4QlZA1edyZuf2NS5IsGzaInPdZKtKPJB5qZE5kXfhE3DDqsZFRHwtUrsmbIAzhd3RytACOMvgLt5wqV9fhEf5eNXk8MABm10cy12E99yWg76VT79iSJhr0H4SJTmSHeIZMhG6rVAJn1e2N73LB5aPIXHWpPsOCm0tXDDrG40iJBuQ2adDqDdppU3X37vNemBruwfBAUexTKSnHg125GWqVykxf3jCTmodvxlqXoPi', '11', '2022-04-26 22:29:20', '2022-04-26 22:29:20', 11, 11, 0, '2022-04-27 15:29:20', NULL),
(28, 2, 11, 'i1l33hX1A7vctKyeEMZwXPRU2P2YoPHfAeCo69D59Ieb0NYFK5b9WMRZMeR7pGcXuDUAvybmHbKYPhkNb8kogikgl8ylAHTDXJblCkNg184SnsTUuHaQsR8NA7uztEqZw2Azo1kFkzwPZeaGgpbp8Fxy7ZyUkhGitAzn7x26BSBntz3Nc5IaiRAXdBQcGifdqlvhjNIZxaVKamU43UCcYdTZSk3JlpTsmynXR3AAvSAOiOJ0DrstDTIeoKf1BCej', '11', '2022-04-26 22:59:20', '2022-04-26 22:59:20', 11, 11, 0, '2022-04-27 15:59:20', NULL),
(29, 2, 10, 'GiBK6Mt5RBFR5CCb9A8NhYs2t3AzBinwRWN0HQEjouHwkJVVbMhiahGQSy3tZpzBtZ83AEuiYWysIexLRlvv9rBpGZq4arBX4T1KF19D7NNV0wK5j8sbrjh35vdgGbHC2hCbajPcnbPD40Xo5ZsjBPcM6lnclVsW1HzynAcqhr9SXR8LRaxkSTAeVruyQKBmDRJLSAnKcnJDtXNkVxycHCd7MJf55yaInRlBRViM2d4zoBr13abLNUfy2T9XeKJZ', '10', '2022-05-03 18:08:19', '2022-05-03 18:08:19', 10, 10, 0, '2022-05-04 11:08:19', NULL),
(30, 2, 2, 'gNpQIaPsPHbKhllQrDgpzkBYKV9O6NuxImQu4pM6h2Z3whmgHQIUUoTxznp0ylEF8ENqKeZqWyMCjmCTIzwhYFg0flIVIaQ1Bfi5laGvhLg7VWhvBVaShupSOPf9GeqOXtJDh7orl9GgJgZDQE3p7bQtR5d3PETU7t9PjwGzn42I5vCNSWsXP1cyn2Lc5QYGqADpENb6fh5Oi4arMevwjizWyiHfZ71U5Uq7UGf9b7rUbSYzgbObRaO9lcnTdjmt', '2', '2022-05-03 21:11:53', '2022-05-03 21:11:53', 2, 2, 0, '2022-05-04 14:11:53', NULL),
(31, 2, 10, 'jiEJvDkF9hQVlMNrtnZodlSIAjeCOaGnRmK9ja67faLdVWgXOZ87QS3HgktYyNZRNQ81nK6emyF5OHSPCdoYnMCgGWi7xahY7oHGpFdggAjOInrz2Kt639MLlRB4360kBLXgevmd4eiUK5Na0d8QaTxafl9EXvjmpCwrr4BkMapWDgV4mBdEZ79gfrfJnY8WEGBtDa8d1ZXIQve8hUUz3IIkUF1GUVy3EUO31NH0Qt3yruaXPcrIG8eLhBfbbcUK', '10', '2022-05-05 01:28:19', '2022-05-05 01:28:19', 10, 10, 0, '2022-05-05 18:28:19', NULL),
(32, 2, 2, 'T6LX735eDAiWvL6mtL1vcKkeqpmaVMIGhMUNbRRTMkUsk74nIBIZswfSe4VSiclw2k4w5rF4Xf76ZhdBJSWNsFod7IiE9tgilCC0jPq6XUmnPnPIHOSWTM8147GFoO5W8A5eDoBkJNobhF1mMdIQrhliyKIERgDxZsDPIrs57C7e9A1agZVPDB7mnZdTSiHSrH1W9M82WOUQ27mve5UHuZPVjRdEZzzxYinh29TKGkO7qDGJAQmnWjL4IzjU6Nu3', '2', '2022-05-05 20:52:04', '2022-05-05 20:52:04', 2, 2, 0, '2022-05-06 13:52:04', NULL),
(33, 2, 11, '4XrGM7ctaG0xXdoOrKsjD1EcWLPE8XQwHDozNY6uHU6cXNIhMA0sv3hbroLOWW0356pNpfc3kRixOQfhj5PXPypxYsedCOqYM44LlUgD0mKhOqRBmIfLj9Km1iv7rKgbtKhgHlGMdJ9B3ZfUMNRU3TsGO1DWYho0mcP7s7nZady8fknZI3DgvR07igruVPiMNZJNZJk9EA5ACCU1OqgtDVEgQo8PxkG5eyk9TKrFmynCshWb8JlWrriWpnwbRFcK', '11', '2022-05-12 01:26:39', '2022-05-12 01:26:39', 11, 11, 0, '2022-05-12 18:26:39', NULL),
(34, 2, 11, '54QdEpc6A1VkkQVho5CEeP8DCGTq3vDOfbERnYDk5VwcmFYwFWd3UJUf4clDdPjNvjdOYGLyDjkCSbKx2IDFWB3WOzxWBGBjtvBwOWifoReCwzoDS5hKWbM8BF36cjDdUoHeDh90HVuk0Ji3v0Xa6Q6ddczIpSyqEOOwTZuEoNhwavIdTtsjHYP9LhHtUPgwvcMdQnx9ltgTuFlskkr18EM0pJ6Dx6NOvYNSS0KckchMf1WWDPt7Op2BhWYmhRsN', '11', '2022-05-12 01:27:42', '2022-05-12 01:27:42', 11, 11, 0, '2022-05-12 18:27:42', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `permission`
--

CREATE TABLE `permission` (
  `permission_id` int(11) NOT NULL,
  `content` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `permission`
--

INSERT INTO `permission` (`permission_id`, `content`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'Quản trị cấp cao', '2021-03-09 00:00:00', '2021-07-13 00:00:00', 0, 0, 0, 0),
(2, 'Quản trị trang', '2021-03-09 00:00:00', '2021-07-13 00:00:00', 0, 0, 0, 0),
(3, 'Trợ lý trang', '2021-03-09 00:00:00', '2021-07-13 00:00:00', 0, 0, 0, 0),
(4, 'kế toán', '2021-03-09 00:00:00', '2021-07-13 00:00:00', 0, 0, 0, 0),
(10, 'Cộng tác viên ', '2021-03-09 00:00:00', '2021-07-13 00:00:00', 0, 0, 0, 0),
(11, 'Ghi danh', '2021-03-09 00:00:00', '2021-07-13 00:00:00', 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product`
--

CREATE TABLE `product` (
  `product_id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `product_group_id` int(11) DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `detail` text CHARACTER SET utf32 COLLATE utf32_vietnamese_ci,
  `image` text CHARACTER SET utf32 COLLATE utf32_vietnamese_ci,
  `store` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `product`
--

INSERT INTO `product` (`product_id`, `company_id`, `product_group_id`, `name`, `detail`, `image`, `store`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 3, 1, 'acccs đ s', '?????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', 2, '2021-08-11 21:57:04', '2021-08-11 21:57:04', 0, 1, 0, 0),
(2, 3, 2, 'test 23', '?????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', 2, '2021-08-11 21:56:33', '2021-08-11 21:57:04', 1, 1, 0, 0),
(3, 4, 3, 'test 14', '獳', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', 1, '2021-08-11 21:57:20', '2021-08-11 21:57:27', 1, 1, 0, 0),
(4, 4, 4, 'test 3', '2', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', 1, '2021-08-15 10:45:04', '2021-08-15 10:45:09', 0, 1, 0, 0),
(5, 5, 1, 'test 145', '1', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', 3, '2021-08-15 10:34:01', '2021-08-15 10:44:50', 1, 1, 0, 0),
(6, 5, 2, '1', '2', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', 3, '2021-08-15 10:44:50', '2021-08-15 10:45:04', 0, 1, 0, 0),
(7, 3, 3, 'test 6', 'sajkdasdjasjd ', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-07 22:39:20', '2021-10-07 22:39:20', 1, 1, 0, 0),
(8, 3, 4, 'test 5', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:02:36', '2021-10-08 22:02:36', 1, 1, 0, 0),
(9, 3, 1, 'test 7', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:02:51', '2021-10-08 22:02:51', 1, 1, 0, 0),
(10, 3, 2, 'test 10', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:04:34', '2021-10-08 22:04:34', 1, 1, 0, 0),
(11, 3, 3, 'test 9', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:07:14', '2021-10-08 22:07:14', 1, 1, 0, 0),
(12, 3, 4, 'test 8', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:26:35', '2021-10-08 22:26:35', 1, 1, 0, 0),
(13, 3, 1, 'test 11', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:27:08', '2021-10-08 22:27:08', 1, 1, 0, 0),
(14, 3, 2, '䱵????', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:27:10', '2021-10-08 22:27:10', 1, 1, 0, 0),
(15, 3, 3, 'sample x', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:29:47', '2021-10-08 22:29:47', 1, 1, 0, 0),
(16, 3, 4, '獤????', '????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:45:05', '2021-10-08 22:45:05', 1, 1, 0, 0),
(17, 3, 1, 'hkj jj', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:46:40', '2021-10-08 22:46:40', 1, 1, 0, 0),
(18, 3, 2, 'anh bạn', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:46:42', '2021-10-08 22:46:42', 1, 1, 0, 0),
(19, 3, 3, 'sample', 'sdsadaskdkasd', 'http://127.0.0.1:3000/uploads/datas/1647795851293-techhust.png', NULL, '2021-10-08 22:46:55', '2021-10-08 22:46:55', 1, 1, 0, 0),
(20, 3, 4, 'ab vi', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:46:57', '2021-10-08 22:46:57', 1, 1, 0, 0),
(21, 3, 1, '??????sá d', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:47:21', '2021-10-08 22:47:21', 1, 1, 0, 0),
(22, 3, 2, '???d', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:47:46', '2021-10-08 22:47:46', 1, 1, 0, 0),
(23, 3, 3, '?????3 vf', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-08 22:51:25', '2021-10-08 22:51:25', 1, 1, 0, 0),
(24, 3, 4, 'an faa', '????????????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-09 01:21:56', '2021-10-09 01:21:56', 1, 1, 0, 0),
(25, 3, 1, '癩????', '?', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-09 03:27:03', '2021-10-09 03:27:03', 1, 1, 0, 0),
(26, 3, 2, 's????????', '?', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-09 03:30:10', '2021-10-09 03:30:10', 1, 1, 0, 0),
(27, 3, 3, '䱵????', '1', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-09 09:05:34', '2021-10-09 09:05:34', 1, 1, 0, 0),
(28, 3, 4, 'test 1', 'á', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-09 09:44:13', '2021-10-09 09:44:13', 1, 1, 0, 0),
(29, 3, 1, '? sdsdsd', '?', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-09 09:47:30', '2021-10-09 09:47:30', 1, 1, 0, 0),
(30, 3, 2, 'test 2', '?', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-09 09:56:18', '2021-10-09 09:56:18', 1, 1, 0, 0),
(31, 3, 2, '? dsdsd', '?', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-09 10:21:42', '2021-10-09 10:21:42', 1, 1, 0, 0),
(32, 3, 3, '愱', '愲', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2021-10-09 10:29:05', '2021-10-09 10:29:05', 1, 1, 0, 0),
(33, 5, 4, 'test 4', '獡????', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2022-03-20 21:35:23', '2022-03-20 21:35:23', 1, 1, 0, 0),
(34, 5, 1, 'sample', 'sample', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2022-03-20 22:12:13', '2022-03-20 22:12:13', 1, 1, 0, 0),
(35, 5, 2, 'Áo táo mèo', 'Sam phê an meo', 'http://127.0.0.1:3000/uploads/datas/1647795851293-techhust.png', NULL, '2022-03-21 00:06:23', '2022-03-21 00:06:23', 1, 1, 0, 0),
(36, 4, 3, 'Lu van', 'sasadsad', 'http://127.0.0.1:3000/uploads/datas/1647798195311-sparc-lab-logo.png', NULL, '2022-03-21 00:43:25', '2022-03-21 00:43:25', 1, 1, 0, 0),
(37, 5, 4, 'áo lô cốt', 'meo meo', 'http://127.0.0.1:3000/uploads/datas/1647798460549-sparc-lab-logo.png', NULL, '2022-03-21 00:47:58', '2022-03-21 00:47:58', 1, 1, 0, 0),
(38, 5, 1, 'sam xx u', 'uneblesadas ', 'http://127.0.0.1:3000/uploads/datas/1647822800189-sparc-lab-logo.png', NULL, '2022-03-21 07:34:10', '2022-03-21 07:34:10', 1, 1, 0, 0),
(39, 3, 2, 'sample 123', 'ví dụ', 'http://127.0.0.1:3000/uploads/datas/1647871096782-sparc-lab-logo.png', NULL, '2022-03-21 20:58:34', '2022-03-21 20:58:34', 1, 1, 0, 0),
(40, 3, 3, 'Lu van', 'abc', 'http://127.0.0.1:3000/uploads/datas/1647875281420-techhust.png', NULL, '2022-03-21 22:09:55', '2022-03-21 22:09:55', 1, 1, 0, 0),
(41, 5, 4, 'Lu van sao', 'ass', 'http://127.0.0.1:3000/uploads/datas/1647875598855-sparc-lab-logo.png', NULL, '2022-03-21 22:13:32', '2022-03-21 22:13:32', 1, 1, 0, 0),
(42, 5, 1, 'abcd abcd efgh', 'meo meo', 'http://127.0.0.1:3000/uploads/datas/1648263017087-sparc-lab-logo.png', NULL, '2022-03-26 09:50:42', '2022-03-26 09:50:42', 1, 1, 0, 0),
(43, 4, 2, '1', '2', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2022-03-26 10:15:52', '2022-03-26 10:15:52', 1, 1, 0, 0),
(44, 3, 3, 'san phna', '1', 'http://127.0.0.1:3000/uploads/datas/1650207068582-image_2022_04_13T03_33_59_102Z.png', NULL, '2022-04-17 21:53:56', '2022-04-17 21:53:56', 13, 13, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_back`
--

CREATE TABLE `product_back` (
  `buyproduct_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `KM` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `product_back`
--

INSERT INTO `product_back` (`buyproduct_id`, `product_id`, `quantity`, `KM`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 1, 2, 1, '2021-08-11 22:44:53', '2021-08-11 22:44:53', 1, 1, 0, 0),
(2, 1, 2, 1, '2021-08-11 22:45:10', '2021-08-11 22:45:14', 0, 1, 1, 0),
(3, 1, 0, 0, '2021-08-11 22:45:01', '2021-08-11 22:45:10', 1, 1, 1, 2),
(4, 1, 1, 1, '2021-08-12 12:54:01', '2021-08-12 12:54:06', 1, 1, 1, 0),
(5, 37, 4, 3, '2022-03-25 00:40:49', '2022-03-25 00:40:49', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_buy`
--

CREATE TABLE `product_buy` (
  `buyproduct_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `selled_id` int(11) NOT NULL,
  `KM` int(11) NOT NULL,
  `status` int(11) NOT NULL,
  `Total` int(11) NOT NULL,
  `note` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `name` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `address` varchar(256) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `product_buy`
--

INSERT INTO `product_buy` (`buyproduct_id`, `customer_id`, `selled_id`, `KM`, `status`, `Total`, `note`, `phone`, `name`, `address`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 3, 16, 120, 0, 5200, '', '', '', '', '2022-03-25 21:48:03', '2022-03-25 21:48:03', 0, 1, 0, 0),
(2, 19, 0, 0, 0, 5200, '', '', '', '', '2021-09-27 02:02:42', '2021-09-27 02:02:42', 0, 0, 0, 0),
(3, 20, 0, 0, 0, 5200, '', '', '', '', '2021-09-27 02:10:11', '2021-09-27 02:10:11', 0, 0, 0, 0),
(4, 21, 0, 0, 0, 5200, '', '', '', '', '2021-09-27 02:12:19', '2021-09-27 02:12:19', 0, 0, 0, 0),
(5, 3, 0, 0, 0, 27000, '', '', '', '', '2022-03-16 21:15:00', '2022-03-16 21:15:00', 0, 0, 0, 0),
(6, 4, 0, 0, 0, 27000, '', '', '', '', '2022-03-16 21:25:58', '2022-03-16 21:25:58', 0, 0, 0, 0),
(7, 2, 0, 0, 0, 27000, '', '', '', '', '2022-03-16 21:31:26', '2022-03-16 21:31:26', 0, 0, 0, 0),
(8, 18, 0, 0, 0, 5200, '', '', '', '', '2021-09-27 01:52:12', '2022-03-25 21:48:03', 0, 1, 1, 1),
(9, 2, 14, 0, 0, 12, '', '', '', '', '2022-03-25 21:50:45', '2022-03-25 21:50:45', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_buy_detail`
--

CREATE TABLE `product_buy_detail` (
  `id_buy_detail` int(11) NOT NULL,
  `buyproduct_id` int(11) NOT NULL,
  `image_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `KM` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `product_buy_detail`
--

INSERT INTO `product_buy_detail` (`id_buy_detail`, `buyproduct_id`, `image_id`, `quantity`, `KM`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 1, 0, 1, 0, '2021-09-27 01:52:12', '2021-09-27 01:52:12', 18, 18, 0, 0),
(2, 1, 0, 1, 0, '2021-09-27 01:52:12', '2021-09-27 01:52:12', 18, 18, 0, 0),
(3, 1, 0, 1, 0, '2021-09-27 01:52:12', '2021-09-27 01:52:12', 18, 18, 0, 0),
(4, 3, 1, 1, 0, '2021-09-27 02:10:11', '2021-09-27 02:10:11', 20, 20, 0, 0),
(5, 3, 4, 1, 0, '2021-09-27 02:10:11', '2021-09-27 02:10:11', 20, 20, 0, 0),
(6, 3, 3, 1, 0, '2021-09-27 02:10:11', '2021-09-27 02:10:11', 20, 20, 0, 0),
(7, 4, 1, 1, 0, '2021-09-27 02:12:19', '2021-09-27 02:12:19', 21, 21, 0, 0),
(8, 4, 4, 1, 0, '2021-09-27 02:12:19', '2021-09-27 02:12:19', 21, 21, 0, 0),
(9, 4, 3, 1, 0, '2021-09-27 02:12:19', '2021-09-27 02:12:19', 21, 21, 0, 0),
(10, 5, 1, 5, 0, '2022-03-16 21:15:00', '2022-03-16 21:15:00', 3, 3, 0, 0),
(11, 5, 2, 3, 0, '2022-03-16 21:15:00', '2022-03-16 21:15:00', 3, 3, 0, 0),
(12, 5, 14, 2, 0, '2022-03-16 21:15:00', '2022-03-16 21:15:00', 3, 3, 0, 0),
(13, 6, 1, 5, 0, '2022-03-16 21:25:58', '2022-03-16 21:25:58', 4, 4, 0, 0),
(14, 6, 2, 3, 0, '2022-03-16 21:25:58', '2022-03-16 21:25:58', 4, 4, 0, 0),
(15, 6, 14, 2, 0, '2022-03-16 21:25:58', '2022-03-16 21:25:58', 4, 4, 0, 0),
(16, 7, 1, 5, 0, '2022-03-16 21:31:26', '2022-03-16 21:31:26', 5, 5, 0, 0),
(17, 7, 2, 3, 0, '2022-03-16 21:31:26', '2022-03-16 21:31:26', 5, 5, 0, 0),
(18, 7, 14, 2, 0, '2022-03-16 21:31:26', '2022-03-16 21:31:26', 5, 5, 0, 0),
(19, 1, 6, 1, 1, '2022-03-25 23:19:12', '2022-03-25 23:19:12', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_buy_return`
--

CREATE TABLE `product_buy_return` (
  `product_buy_return_id` int(11) NOT NULL,
  `buyproduct_id` int(11) NOT NULL,
  `content` varchar(255) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NOT NULL,
  `status` int(11) NOT NULL,
  `cost_confirm` int(11) NOT NULL,
  `user_comfirm` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_group`
--

CREATE TABLE `product_group` (
  `product_group_id` int(11) NOT NULL,
  `product_group_content` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `product_group`
--

INSERT INTO `product_group` (`product_group_id`, `product_group_content`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'Điện tử', '2022-04-06 00:00:00', '2022-04-06 00:00:00', 1, 1, 0, 0),
(2, 'Sách', '2022-04-06 00:00:00', '2022-04-06 00:00:00', 1, 1, 0, 0),
(3, 'Thiên nhiên', '2022-04-06 00:00:00', '2022-04-06 00:00:00', 1, 1, 0, 0),
(4, 'Linh kiện', '2022-04-06 00:00:00', '2022-04-06 00:00:00', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_image`
--

CREATE TABLE `product_image` (
  `image_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `name_image_detail` varchar(100) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `image_info_detail` varchar(256) DEFAULT NULL,
  `cost_detail` int(11) DEFAULT NULL,
  `cost_real` int(11) NOT NULL,
  `promotion` varchar(128) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `product_image`
--

INSERT INTO `product_image` (`image_id`, `product_id`, `name_image_detail`, `image_info_detail`, `cost_detail`, `cost_real`, `promotion`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 1, 'thiet bi 1', 'https://cf.shopee.vn/file/e15e95f7f5843edc38fae1fcd38705ac', 3000, 3300, 'giảm giá 10%', '2021-09-14 00:00:00', '2021-09-14 00:00:00', 1, 1, 0, 0),
(2, 1, 'thiet bi 2', 'https://product.hstatic.net/1000069225/product/wifi_smart_switch_sonoff_th16.jpg', 2000, 2200, 'giảm giá 10%', '2021-09-14 00:00:00', '2021-09-14 00:00:00', 1, 1, 0, 0),
(3, 1, 'van xả', 'https://chipviet.vn/wp-content/uploads/2021/03/104186-cong-tac-dieu-khien-nhiet-do-do-am-wifi-wifi-smart-switch-sonoff-th16-h1.jpg', 1200, 2400, 'giảm giá 50%', '2021-09-14 00:00:00', '2021-09-14 00:00:00', 1, 1, 0, 0),
(4, 1, 'van ép', 'https://file-cdn.bzfuture.com/news/9ecf93f4f00bbc46aaaa234a2de07f4a.png', 1000, 2000, 'giảm giá 50%', '2021-09-14 00:00:00', '2021-09-14 00:00:00', 1, 1, 0, 0),
(5, 27, 'accc', 'http://127.0.0.1:3000/uploads/datas/1633745127647-shop-gau-teddy-can-tho-697752.jpg', 4000, 0, '', '2021-10-09 09:10:14', '2021-10-09 09:10:14', 1, 1, 0, 0),
(6, 27, 'ádasdasd', 'http://127.0.0.1:3000/uploads/datas/1633745430164-Untitled9.png', 4000, 0, '', '2021-10-09 09:10:39', '2021-10-09 09:10:39', 1, 1, 0, 0),
(7, 28, 'aca', 'http://127.0.0.1:3000/uploads/datas/1633747437605-Untitled3.png', 2000, 0, '', '2021-10-09 09:44:29', '2021-10-09 09:44:29', 1, 1, 0, 0),
(8, 29, 'asen', 'http://127.0.0.1:3000/uploads/datas/1633747640761-shop-gau-teddy-can-tho-697752.jpg', 5550, 0, '', '2021-10-09 09:49:42', '2021-10-09 09:49:42', 1, 1, 0, 0),
(9, 30, 'aaaa', 'http://127.0.0.1:3000/uploads/datas/1633748170208-Untitled1.png', 3000, 0, '', '2021-10-09 09:56:27', '2021-10-09 09:56:27', 1, 1, 0, 0),
(10, 31, ' ab ban', 'http://127.0.0.1:3000/uploads/datas/1633749682014-shop-gau-teddy-can-tho-697752.jpg', 2000, 0, '', '2021-10-09 10:21:52', '2021-10-09 10:21:52', 1, 1, 0, 0),
(11, 32, 'a3', 'http://127.0.0.1:3000/uploads/datas/1633750138347-shop-gau-teddy-can-tho-697752.jpg', 2000, 0, '', '2021-10-09 10:29:13', '2021-10-09 10:29:13', 1, 1, 0, 0),
(12, 1, 'saple', 'https://www.w3schools.com/howto/img_paris.jpg', 2000, 2200, 'giảm giá 10%', '2022-02-16 00:00:00', '2022-02-16 00:00:00', 1, 1, 0, 0),
(13, 1, 'UV-', 'https://www.w3schools.com/howto/img_paris.jpg', 2000, 2200, 'giảm giá 10%', '2022-02-16 00:00:00', '2022-02-16 00:00:00', 1, 1, 0, 0),
(14, 1, 'VX', 'https://product.hstatic.net/1000069225/product/wifi_smart_switch_sonoff_th16.jpg', 3000, 6000, 'giảm giá 50%', '2022-03-22 00:00:00', '2022-03-30 00:00:00', 1, 1, 0, 0),
(15, 1, 'Động cơ', 'https://product.hstatic.net/1000069225/product/wifi_smart_switch_sonoff_th16.jpg', 3000, 3000, '', '2022-03-22 00:00:00', '2022-03-30 00:00:00', 1, 1, 0, 0),
(16, 34, ' sample info', 'https://product.hstatic.net/1000069225/product/wifi_smart_switch_sonoff_th16.jpg', 2000, 3000, 'không', '2022-03-20 22:29:12', '2022-03-20 22:29:12', 1, 1, 0, 0),
(17, 34, ' sanple xas', ' http://127.0.0.1:3000/uploads/datas/1647789366183-checkvgData.jpg', 1000, 1000, 'no', '2022-03-20 22:29:32', '2022-03-20 22:29:32', 1, 1, 0, 0),
(18, 37, ' cà vạt đôi', 'http://127.0.0.1:3000/uploads/datas/1647798486414-sparc-lab-logo.png', 13000, 14000, 'không', '2022-03-21 00:48:30', '2022-03-21 00:48:30', 1, 1, 0, 0),
(19, 37, ' sâs', 'http://127.0.0.1:3000/uploads/datas/1647798530837-710db24dc80f05515c1e.jpg', 14000, 17000, 'no', '2022-03-21 00:49:03', '2022-03-21 00:49:03', 1, 1, 0, 0),
(20, 37, ' samoke', 'http://127.0.0.1:3000/uploads/datas/1647798554337-Untitled.png', 13000, 10400, 'sss', '2022-03-21 00:49:43', '2022-03-21 00:49:43', 1, 1, 0, 0),
(21, 38, ' cà vạt đôi alo', 'http://127.0.0.1:3000/uploads/datas/1647822942089-techhust.png', 1000, 1000, 'không', '2022-03-21 07:35:53', '2022-03-21 07:35:53', 1, 1, 0, 0),
(22, 38, ' no main', 'http://127.0.0.1:3000/uploads/datas/1647822961054-z2882947475360_1de72812e3d6b19e7e09ca5b38e9014c.jpg', 1000, 1000, 'sampe', '2022-03-21 07:36:16', '2022-03-21 07:36:16', 1, 1, 0, 0),
(23, 38, ' acess', ' ', 1000, 1000, 'sd', '2022-03-21 07:36:43', '2022-03-21 07:36:43', 1, 1, 0, 0),
(24, 39, ' i con', 'http://127.0.0.1:3000/uploads/datas/1647871124022-sparc-lab-logo.png', 1000, 1000, 'không', '2022-03-21 20:58:54', '2022-03-21 20:58:54', 1, 1, 0, 0),
(25, 39, ' no icon', 'http://127.0.0.1:3000/uploads/datas/1647871142387-techhust.png', 1000, 1000, '1000', '2022-03-21 20:59:12', '2022-03-21 20:59:12', 1, 1, 0, 0),
(26, 40, 'sâsa', 'http://127.0.0.1:3000/uploads/datas/1647875401510-checkvgData.jpg', 1000, 1000, 'ư', '2022-03-21 22:10:07', '2022-03-21 22:10:07', 1, 1, 0, 0),
(27, 41, ' cà vạt đôi', 'http://127.0.0.1:3000/uploads/datas/1647875620659-sparc-lab-logo.png', 1000, 1000, 'a', '2022-03-21 22:13:47', '2022-03-21 22:13:47', 1, 1, 0, 0),
(28, 42, ' sassssssssssssssssssss', 'http://127.0.0.1:3000/uploads/datas/1648263048763-sparc-lab-logo.png', 1000, 1000, '1000', '2022-03-26 09:50:57', '2022-03-26 09:50:57', 1, 1, 0, 0),
(29, 42, ' sdsđ', 'http://127.0.0.1:3000/uploads/datas/1648263064395-sparc-lab-logo.png', 1000, 1000, '20000', '2022-03-26 09:51:16', '2022-03-26 09:51:16', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_lost`
--

CREATE TABLE `product_lost` (
  `stord_id` int(11) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `company_id` varchar(100) DEFAULT NULL,
  `content` varchar(50) DEFAULT NULL,
  `number` varchar(50) DEFAULT NULL,
  `contain` varchar(50) DEFAULT NULL,
  `expridate` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `product_lost`
--

INSERT INTO `product_lost` (`stord_id`, `product_id`, `company_id`, `content`, `number`, `contain`, `expridate`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, '1', '3', '1a', '1', '1', '0000-00-00 00:00:00', '2021-08-11 22:10:25', '2021-08-11 22:10:25', 0, 1, 0, 0),
(2, '1', '3', '1', '1', '1', '0000-00-00 00:00:00', '2021-08-11 22:10:18', '2021-08-11 22:10:25', 1, 1, 1, 1),
(3, '1', '3', 'a', '2', '1', '0000-00-00 00:00:00', '2021-08-11 22:10:45', '2021-08-11 22:10:51', 1, 1, 1, 0),
(4, '42', '5', '10000 a', '1000', '1000', '2022-03-01 00:00:00', '2022-03-26 10:07:32', '2022-03-26 10:07:32', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_pages`
--

CREATE TABLE `product_pages` (
  `product_pages_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `filesave` varchar(256) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `product_pages`
--

INSERT INTO `product_pages` (`product_pages_id`, `product_id`, `filesave`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 34, 'storeHtml/fileb3SVoeJUQfPzivLYRqG91647790277179.html', '2022-03-20 22:31:17', '2022-03-20 22:31:17', 1, 1, 0, 0),
(2, 0, 'storeHtml/file47cDR7VkPwvg2VchN4H11647797792322.html', '2022-03-21 00:36:32', '2022-03-21 00:36:32', 1, 1, 0, 0),
(3, 4, 'storeHtml/fileJK9fOODSQG1nvZnY7b1m1647797948013.html', '2022-03-21 00:39:08', '2022-03-21 00:39:08', 1, 1, 0, 0),
(4, 4, 'storeHtml/filenoI0bEiB7hrM03eC9sOA1647797953541.html', '2022-03-21 00:39:13', '2022-03-21 00:39:13', 1, 1, 0, 0),
(5, 0, 'storeHtml/filebc7NK5ITI5tmdXKZJZ051647798035874.html', '2022-03-21 00:40:35', '2022-03-21 00:40:35', 1, 1, 0, 0),
(6, 37, 'storeHtml/fileAg48BKVnq7KtIYPg9qmG1647798655549.html', '2022-03-21 00:50:55', '2022-03-21 00:50:55', 1, 1, 0, 0),
(7, 38, 'storeHtml/filePvu952Rj93TFcJJq2g9Z1647823026192.html', '2022-03-21 07:37:06', '2022-03-21 07:37:06', 1, 1, 0, 0),
(8, 39, 'storeHtml/fileZeKpfXTRCuwabvSa1Eo41647871204470.html', '2022-03-21 21:00:04', '2022-03-21 21:00:04', 1, 1, 0, 0),
(9, 0, 'storeHtml/fileD3iiQUncJiyEbc3ltHMI1647974982288.html', '2022-03-23 01:49:42', '2022-03-23 01:49:42', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_store`
--

CREATE TABLE `product_store` (
  `store_product_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `company_id` int(11) DEFAULT NULL,
  `content` varchar(50) DEFAULT NULL,
  `image_id` int(11) NOT NULL,
  `number` varchar(50) DEFAULT NULL,
  `contain` varchar(50) DEFAULT NULL,
  `expridate` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `product_store`
--

INSERT INTO `product_store` (`store_product_id`, `product_id`, `company_id`, `content`, `image_id`, `number`, `contain`, `expridate`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 1, 3, 'Kho long bình', 1, '10', '1', '0000-00-00 00:00:00', '2021-08-11 22:02:41', '2021-08-11 22:02:41', 1, 1, 0, 0),
(2, 2, 3, 'Sony Smart Air Condtion', 2, '18', '4', '0000-00-00 00:00:00', '2021-08-11 22:04:54', '2021-08-11 22:04:57', 0, 1, 0, 0),
(3, 3, 4, 'kho long bình', 3, '14', '1', '0000-00-00 00:00:00', '2021-08-11 22:04:46', '2021-08-11 22:04:54', 1, 1, 0, 0),
(4, 4, 4, 'kho long bình', 4, '15', '1', '2021-09-16 00:00:00', '2021-06-16 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(5, 5, 5, 'kho long bình', 12, '20', '1', '2021-09-16 00:00:00', '2021-06-16 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(6, 6, 5, 'Sony Smart Air Condtion', 13, '30', '1', '2021-09-16 00:00:00', '2021-06-16 00:00:00', '2021-07-12 00:00:00', 1, 1, 0, 0),
(7, 32, 3, 'Qu?n tr?', 11, '10', '10', NULL, '2021-10-09 10:39:34', '2021-10-09 10:39:34', 1, 1, 0, 0),
(8, 6, 3, 'kho long bình', 14, '1', '1', '2022-02-04 02:00:00', '2022-02-12 03:48:34', '2022-02-12 03:48:34', 1, 1, 0, 0),
(9, 4, 3, '1', 1, '1', '1', '2022-02-09 00:00:00', '2022-02-17 21:36:41', '2022-02-17 21:36:41', 1, 1, 0, 0),
(10, 34, 5, 'không có', 16, '1000', '1000', '2022-03-20 17:00:00', '2022-03-20 22:29:56', '2022-03-20 22:29:56', 1, 1, 0, 0),
(11, 34, 5, 'T?ng kho long bình', 17, '1000', '900', '2022-03-27 17:00:00', '2022-03-20 22:30:32', '2022-03-20 22:30:32', 1, 1, 0, 0),
(12, 37, 5, 'ss', 18, '1000', '20', '2022-03-20 17:00:00', '2022-03-21 00:50:02', '2022-03-21 00:50:02', 1, 1, 0, 0),
(13, 37, 5, '2', 19, '1000', '20', '2022-03-25 17:00:00', '2022-03-21 00:50:18', '2022-03-21 00:50:18', 1, 1, 0, 0),
(14, 37, 5, NULL, 19, '1000', NULL, '2022-03-31 17:00:00', '2022-03-21 00:50:33', '2022-03-21 00:50:33', 1, 1, 0, 0),
(15, 38, 5, 's', 21, '1000', NULL, '2022-03-20 17:00:00', '2022-03-21 07:36:56', '2022-03-21 07:36:56', 1, 1, 0, 0),
(16, 39, 3, 'kho qu?ng ?ông', 24, '1000', '10', '2022-03-10 17:00:00', '2022-03-21 20:59:37', '2022-03-21 20:59:37', 1, 1, 0, 0),
(17, 39, 3, 'qu?ng tây', 25, '1000', '20', '2022-03-26 17:00:00', '2022-03-21 20:59:50', '2022-03-21 20:59:50', 1, 1, 0, 0),
(18, 40, 3, 'xx', 26, '1000', '30', '2022-03-21 17:00:00', '2022-03-21 22:11:09', '2022-03-21 22:11:09', 1, 1, 0, 0),
(19, 41, 5, 'sss', 27, '1000', '20', '2022-03-20 17:00:00', '2022-03-21 22:14:01', '2022-03-21 22:14:01', 1, 1, 0, 0),
(20, 42, 5, '2222', 28, '1000', NULL, '2022-03-20 17:00:00', '2022-03-26 09:51:28', '2022-03-26 09:51:28', 1, 1, 0, 0),
(21, 41, 6, 'ko co', 8, '12', '21', '2022-03-26 00:00:00', '2022-03-26 10:29:51', '2022-03-26 10:29:51', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `return_service`
--

CREATE TABLE `return_service` (
  `bill_service_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `value` int(11) NOT NULL,
  `bank` varchar(128) CHARACTER SET utf8 DEFAULT NULL,
  `detail_bank` varchar(128) CHARACTER SET utf8 DEFAULT NULL,
  `content` varchar(128) CHARACTER SET utf8 DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `return_service`
--

INSERT INTO `return_service` (`bill_service_id`, `customer_id`, `service_id`, `value`, `bank`, `detail_bank`, `content`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 1, 1, 1, '1', '1', '1', '2021-08-11 22:54:14', '2021-08-11 22:54:19', 1, 1, 1, 0),
(2, 3, 4, 12999, 'ss', 'sá', 'ss', '2022-03-24 23:26:25', '2022-03-24 23:26:25', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `service`
--

CREATE TABLE `service` (
  `service_id` int(11) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf8 DEFAULT NULL,
  `image` varchar(256) NOT NULL,
  `cost` int(11) NOT NULL,
  `downloads` int(11) NOT NULL,
  `service_group_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `service`
--

INSERT INTO `service` (`service_id`, `name`, `content`, `image`, `cost`, `downloads`, `service_group_id`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'png to svg', 'Một máy bay của Pakistan đã đến sân bay Kabul vào ngày 13/9, đánh dấu chuyến bay thương mại quốc tế đầu tiên hạ cánh ở đây kể từ khi Taliban lên nắm quyền tại Afghanistan', 'https://d1j8r0kxyu9tj8.cloudfront.net/images/1566394573t7NmKpCOtnQNiON.jpg', 1, 1, 0, '2021-08-11 23:06:20', '2021-08-11 23:06:25', 1, 1, 0, 0),
(2, 'image cutting', 'Một máy bay của Pakistan đã đến sân bay Kabul vào ngày 13/9, đánh dấu chuyến bay thương mại quốc tế đầu tiên hạ cánh ở đây kể từ khi Taliban lên nắm quyền tại Afghanistan', 'https://d1j8r0kxyu9tj8.cloudfront.net/images/1566394573t7NmKpCOtnQNiON.jpg', 1, 1, 0, '2021-08-12 12:54:32', '2021-08-12 12:54:32', 0, 1, 0, 0),
(3, 'svg to png', 'Một máy bay của Pakistan đã đến sân bay Kabul vào ngày 13/9, đánh dấu chuyến bay thương mại quốc tế đầu tiên hạ cánh ở đây kể từ khi Taliban lên nắm quyền tại Afghanistan', 'https://d1j8r0kxyu9tj8.cloudfront.net/images/1566394573t7NmKpCOtnQNiON.jpg', 1, 1, 0, '2021-08-12 12:54:22', '2021-08-12 12:54:32', 1, 1, 0, 2),
(4, 'công c? v?', 'Một máy bay của Pakistan đã đến sân bay Kabul vào ngày 13/9, đánh dấu chuyến bay thương mại quốc tế đầu tiên hạ cánh ở đây kể từ khi Taliban lên nắm quyền tại Afghanistan', 'https://d1j8r0kxyu9tj8.cloudfront.net/images/1566394573t7NmKpCOtnQNiON.jpg', 1, 1, 0, '2021-08-12 23:16:26', '2021-08-12 23:16:26', 1, 1, 0, 0),
(5, '', 'Một máy bay của Pakistan đã đến sân bay Kabul vào ngày 13/9, đánh dấu chuyến bay thương mại quốc tế đầu tiên hạ cánh ở đây kể từ khi Taliban lên nắm quyền tại Afghanistan', 'https://d1j8r0kxyu9tj8.cloudfront.net/images/1566394573t7NmKpCOtnQNiON.jpg', 0, 0, 0, '2021-08-12 23:17:03', '2021-08-12 23:17:03', 1, 1, 0, 0),
(6, 'ab', 'Một máy bay của Pakistan đã đến sân bay Kabul vào ngày 13/9, đánh dấu chuyến bay thương mại quốc tế đầu tiên hạ cánh ở đây kể từ khi Taliban lên nắm quyền tại Afghanistan', 'https://d1j8r0kxyu9tj8.cloudfront.net/images/1566394573t7NmKpCOtnQNiON.jpg', 3, 1, 0, '2021-08-13 20:34:50', '2021-08-13 20:34:50', 0, 1, 0, 0),
(7, 'a', 'a', 'https://d1j8r0kxyu9tj8.cloudfront.net/images/1566394573t7NmKpCOtnQNiON.jpg', 0, 0, 0, '2021-08-12 23:17:29', '2021-08-13 20:21:08', 1, 1, 0, 6),
(8, 'a', 'ab', 'https://d1j8r0kxyu9tj8.cloudfront.net/images/1566394573t7NmKpCOtnQNiON.jpg', 2, 0, 0, '2021-08-13 20:21:08', '2021-08-13 20:21:26', 0, 1, 0, 6),
(9, 'a', 'ab', 'https://d1j8r0kxyu9tj8.cloudfront.net/images/1566394573t7NmKpCOtnQNiON.jpg', 3, 0, 0, '2021-08-13 20:21:26', '2021-08-13 20:34:50', 0, 1, 0, 6),
(10, 'w', 'ww', 'http://127.0.0.1:3000/uploads/datas/1634054415085-Untitled9.png', 1000, 1000, 4, '2021-10-12 23:00:38', '2021-10-12 23:00:38', 1, 1, 0, 0),
(11, ' smaaa', ' sss', 'http://127.0.0.1:3000/uploads/datas/1647975947049-phanbiet.png', 2000, 10, 6, '2022-03-23 02:06:06', '2022-03-23 02:06:06', 1, 1, 0, 0),
(12, ' xxxxx', ' sádsadsad', '', 1220, 2204, 0, '2022-03-24 22:08:44', '2022-03-24 22:08:44', 0, 1, 0, 0),
(13, 'dsdsd', ' sds', 'http://127.0.0.1:3000/uploads/datas/1648050667457-checkvgData.jpg', 2220, 20, 8, '2022-03-23 22:51:15', '2022-03-23 22:51:15', 1, 1, 0, 0),
(14, ' xxxxx', ' sádsadsad', 'http://127.0.0.1:3000/uploads/datas/1647976076868-sparc-lab-logo.png', 1220, 220, 6, '2022-03-23 02:08:52', '2022-03-24 22:08:44', 1, 1, 1, 12),
(15, 'samp;e', 'saple', 'http://127.0.0.1:3000/uploads/datas/1648135061749-techhust.png', 1222, 1234, 5, '2022-03-24 22:17:52', '2022-03-24 22:17:52', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `service_bill`
--

CREATE TABLE `service_bill` (
  `bill_service_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `value` int(11) NOT NULL,
  `content` varchar(1024) CHARACTER SET utf8 DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `service_bill`
--

INSERT INTO `service_bill` (`bill_service_id`, `customer_id`, `service_id`, `value`, `content`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 1, 2, 1, '1', '2021-08-11 23:01:50', '2021-08-11 23:01:54', 0, 1, 1, 0),
(2, 1, 1, 1, '1', '2021-08-11 23:01:46', '2021-08-11 23:01:50', 1, 1, 1, 1),
(3, 1, 4, 0, 'âs', '2021-08-22 16:48:02', '2021-08-22 16:48:02', 15, 15, 0, 0),
(4, 2, 2, 12000, 'ko', '2022-03-24 23:24:08', '2022-03-24 23:24:08', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `service_charging`
--

CREATE TABLE `service_charging` (
  `bill_service_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `value` int(11) NOT NULL,
  `bank` varchar(128) CHARACTER SET utf8 DEFAULT NULL,
  `detail_bank` varchar(128) CHARACTER SET utf8 DEFAULT NULL,
  `content` varchar(128) CHARACTER SET utf8 DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `service_charging`
--

INSERT INTO `service_charging` (`bill_service_id`, `customer_id`, `service_id`, `value`, `bank`, `detail_bank`, `content`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 2, 1, 1, '1', '1', '`', '2021-08-11 22:54:31', '2021-08-11 22:54:36', 1, 1, 1, 0),
(2, 1, 2, 2, '1', '1', '1', '2021-08-12 21:04:24', '2021-08-12 21:04:28', 0, 1, 1, 0),
(3, 1, 2, 1, '1', '1', '1', '2021-08-12 21:04:17', '2021-08-12 21:04:24', 1, 1, 1, 2);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `service_group`
--

CREATE TABLE `service_group` (
  `service_group_id` int(11) NOT NULL,
  `image` varchar(256) NOT NULL,
  `title` varchar(50) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `content` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `company_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `service_group`
--

INSERT INTO `service_group` (`service_group_id`, `image`, `title`, `content`, `company_id`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'http://127.0.0.1:3000/uploads/datas/1634046888589-shop-gau-teddy-can-tho-697752.jpg', 'acc', 'w', 3, '2022-03-23 02:01:55', '2022-03-23 02:17:15', 1, 1, 1, 0),
(2, 'http://127.0.0.1:3000/uploads/datas/1634051222996-shop-gau-teddy-can-tho-697752.jpg', 'abc', 'ốp sam sung', 3, '2022-03-23 02:01:55', '2022-03-23 02:17:26', 1, 1, 1, 0),
(3, 'http://127.0.0.1:3000/uploads/datas/1634053773864-shop-gau-teddy-can-tho-697752.jpg', 'accc', 'sss', 3, '2022-03-23 02:01:55', '2022-03-23 02:01:55', 1, 1, 0, 0),
(4, 'http://127.0.0.1:3000/uploads/datas/1634054387928-shop-gau-teddy-can-tho-697752.jpg', 'sss', 'sss', 3, '2022-03-23 02:01:55', '2022-03-23 02:01:55', 1, 1, 0, 0),
(5, 'http://127.0.0.1:3000/uploads/datas/1647974938876-techhust.png', 'meo meo', 'meo', 0, '2022-03-23 02:17:43', '2022-03-23 02:17:43', 0, 1, 0, 0),
(6, 'http://127.0.0.1:3000/uploads/datas/1647975582575-checkvgData.jpg', 'ssssa', 'aaaaaaaaaaaa', 4, '2022-03-23 02:01:55', '2022-03-23 02:01:55', 1, 1, 0, 0),
(7, 'http://127.0.0.1:3000/uploads/datas/1647974938876-techhust.png', 'meo meo', 'meo', 5, '2022-03-23 02:01:55', '2022-03-23 02:17:43', 1, 1, 1, 5),
(8, 'http://127.0.0.1:3000/uploads/datas/1648050652583-IMG_9049.jpg', 'dddddddd', 'ddddddđ', 3, '2022-03-23 22:50:54', '2022-03-23 22:50:54', 1, 1, 0, 0),
(9, 'http://127.0.0.1:3000/uploads/datas/1648052574104-sparc-lab-logo.png', 's', 's', 5, '2022-03-23 23:22:56', '2022-03-23 23:22:56', 0, 1, 0, 0),
(10, 'http://127.0.0.1:3000/uploads/datas/1648052547725-checkvgData.jpg', 's', 's', 5, '2022-03-23 23:22:35', '2022-03-23 23:22:56', 1, 1, 1, 9);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `service_pages`
--

CREATE TABLE `service_pages` (
  `service_pages_id` int(11) NOT NULL,
  `service_group_id` int(11) NOT NULL,
  `filesave` varchar(256) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `service_pages`
--

INSERT INTO `service_pages` (`service_pages_id`, `service_group_id`, `filesave`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(9, 6, 'storeHtml/fileiV2qO22ZsBv5Md8pxxmU1647975594612.html', '2022-03-23 01:59:54', '2022-03-23 01:59:54', 1, 1, 0, 0),
(10, 6, 'storeHtml/filepwjfZfAjEAsXjMHcIFTX1647975715252.html', '2022-03-23 02:01:55', '2022-03-23 02:01:55', 1, 1, 0, 0),
(11, 8, 'storeHtml/filetAsCMTg1Cf3kVhcAGZrp1648050660753.html', '2022-03-23 22:51:00', '2022-03-23 22:51:00', 1, 1, 0, 0),
(12, 5, 'storeHtml/fileGfHr9C7UWgAJ7tyL73CK1648143492564.html', '2022-03-25 00:36:27', '2022-03-25 00:38:12', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `social_shop`
--

CREATE TABLE `social_shop` (
  `social_shop_id` int(11) NOT NULL,
  `name_shop` varchar(50) DEFAULT NULL,
  `product_id` int(11) NOT NULL,
  `link` varchar(512) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Đang đổ dữ liệu cho bảng `social_shop`
--

INSERT INTO `social_shop` (`social_shop_id`, `name_shop`, `product_id`, `link`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'shoppe', 1, 'https://shopee.vn/Hub-type-C-USB-C6-JVJ-6-trong-1-%C4%91a-n%C4%83ng-c%E1%BB%95ng-chuy%E1%BB%83n-%C4%91%E1%BB%95i-chia-c%E1%BB%95ng-USB-3.0-t%E1%BB%91c-%C4%91%E1%BB%99-500Mb-s-SD-TF-4K-HDMI-cho-MacBook-lap-i.164964754.6091611702?sp_atk=a9e342ea-b9af-4211-9dd0-c31e8eb83b14', '2022-03-22 00:00:00', '2022-03-23 00:00:00', 1, 1, 0, 0),
(2, 'tiki', 1, 'https://tiki.vn/dien-thoai-iphone-11-128gb-hang-chinh-hang-p121790468.html?spid=138625460', '2022-03-22 00:00:00', '2022-03-23 00:00:00', 1, 1, 0, 0),
(3, 'lazada', 1, 'https://www.lazada.vn/products/kuulaa-15w-qi-wireless-charger-sac-khong-day-fast-charging-stand-quick-charge-wire-less-adapter-compatible-iphone-apple-watch-airpods-huawei-samsung-i1500455789-s6282430650.html?search=store&mp=3&spm=a2o4n.10441748.cutImages_1352940487.3', '2022-03-22 00:00:00', '2022-03-23 00:00:00', 1, 1, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `stock_buy`
--

CREATE TABLE `stock_buy` (
  `stock_buy_id` int(11) NOT NULL,
  `stock_id` int(11) NOT NULL,
  `customer_buy` int(11) NOT NULL,
  `number` int(11) NOT NULL,
  `cost` int(11) NOT NULL,
  `user_approved_id` int(11) NOT NULL,
  `note` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=DYNAMIC;

--
-- Đang đổ dữ liệu cho bảng `stock_buy`
--

INSERT INTO `stock_buy` (`stock_buy_id`, `stock_id`, `customer_buy`, `number`, `cost`, `user_approved_id`, `note`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 1, 1, 1, 1, 1, '1', '2022-02-10 01:20:27', '2022-02-10 01:20:27', 2, 2, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `stock_info_aaa`
--

CREATE TABLE `stock_info_aaa` (
  `date` datetime NOT NULL,
  `open` float DEFAULT NULL,
  `high` float DEFAULT NULL,
  `low` float DEFAULT NULL,
  `close` float DEFAULT NULL,
  `volume` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=DYNAMIC;

--
-- Đang đổ dữ liệu cho bảng `stock_info_aaa`
--

INSERT INTO `stock_info_aaa` (`date`, `open`, `high`, `low`, `close`, `volume`) VALUES
('2010-11-17 00:00:00', 19.0626, 19.8568, 18.6654, 19.5391, 0),
('2010-11-18 00:00:00', 19.8569, 20.6511, 19.4597, 20.6511, 0),
('2010-11-19 00:00:00', 21.922, 21.922, 21.1277, 21.4454, 0),
('2010-11-22 00:00:00', 20.8894, 22.3985, 20.254, 22.0808, 0),
('2010-11-23 00:00:00', 21.6837, 23.1134, 21.4454, 23.1134, 0),
('2010-11-24 00:00:00', 23.4311, 24.3842, 22.6368, 24.3842, 0),
('2010-11-25 00:00:00', 25.0196, 25.8933, 24.2254, 25.8933, 0),
('2010-11-26 00:00:00', 27.1642, 27.4819, 26.2111, 27.4025, 0),
('2010-11-29 00:00:00', 27.7996, 28.7527, 25.8933, 28.5145, 0),
('2010-11-30 00:00:00', 27.7996, 28.991, 27.323, 27.5613, 0),
('2010-12-01 00:00:00', 27.4025, 27.7202, 26.2111, 26.2905, 0),
('2010-12-02 00:00:00', 26.2905, 28.3556, 26.2111, 28.3556, 0),
('2010-12-03 00:00:00', 29.3881, 29.7059, 28.6733, 29.7059, 0),
('2010-12-06 00:00:00', 30.1824, 30.9767, 28.7527, 28.991, 0),
('2010-12-07 00:00:00', 29.7059, 29.7059, 27.6407, 27.6407, 0),
('2010-12-08 00:00:00', 27.7202, 27.7202, 26.1316, 26.1316, 0),
('2010-12-09 00:00:00', 25.4168, 27.7202, 25.2579, 26.6876, 0),
('2010-12-10 00:00:00', 27.0053, 28.0379, 26.8465, 28.0379, 0),
('2010-12-13 00:00:00', 29.3881, 29.6264, 28.991, 29.6264, 0),
('2010-12-14 00:00:00', 30.8973, 30.8973, 27.4819, 27.6407, 0),
('2010-12-15 00:00:00', 27.7996, 28.5939, 27.0053, 27.2436, 0),
('2010-12-16 00:00:00', 26.6082, 26.8465, 25.8933, 26.0522, 0),
('2010-12-17 00:00:00', 27.0053, 27.9585, 26.2111, 27.7996, 0),
('2010-12-20 00:00:00', 28.1967, 28.1967, 26.6082, 27.0053, 0),
('2010-12-21 00:00:00', 27.4819, 27.6407, 26.2111, 27.0053, 0),
('2010-12-22 00:00:00', 27.4025, 27.7202, 26.0522, 26.2905, 0),
('2010-12-23 00:00:00', 26.0522, 26.2111, 25.1785, 25.4168, 0),
('2010-12-24 00:00:00', 25.5756, 27.0053, 25.4168, 26.5288, 0),
('2010-12-27 00:00:00', 27.0053, 27.0053, 26.4493, 26.6082, 0),
('2010-12-28 00:00:00', 26.9259, 27.7996, 26.6876, 27.4819, 0),
('2010-12-29 00:00:00', 27.323, 27.5613, 26.6876, 26.9259, 0),
('2010-12-30 00:00:00', 26.9259, 26.9259, 26.2111, 26.4493, 0),
('2010-12-31 00:00:00', 26.6075, 26.6075, 26.1323, 26.3699, 0),
('2011-01-04 00:00:00', 27.0053, 27.1642, 26.4493, 26.6082, 0),
('2011-01-05 00:00:00', 26.6876, 26.8465, 25.8933, 26.1316, 0),
('2011-01-06 00:00:00', 26.1316, 26.3699, 25.9728, 26.2111, 0),
('2011-01-07 00:00:00', 25.8139, 26.5288, 25.8139, 26.4493, 0),
('2011-01-10 00:00:00', 26.8465, 27.7996, 26.2905, 26.9259, 0),
('2011-01-11 00:00:00', 27.2436, 27.2436, 26.1316, 26.8465, 0),
('2011-01-12 00:00:00', 26.6082, 28.3556, 26.6082, 27.7996, 0),
('2011-01-13 00:00:00', 28.991, 28.991, 27.4025, 27.6407, 0),
('2011-01-14 00:00:00', 27.6407, 27.7996, 27.0053, 27.4819, 0),
('2011-01-17 00:00:00', 27.4025, 27.879, 27.323, 27.6407, 0),
('2011-01-18 00:00:00', 27.7202, 29.547, 27.7202, 28.5939, 0),
('2011-01-19 00:00:00', 29.2293, 30.7384, 28.991, 30.103, 0),
('2011-01-20 00:00:00', 29.8647, 30.659, 29.7059, 30.103, 0),
('2011-01-21 00:00:00', 30.0236, 30.9767, 28.8321, 29.1499, 0),
('2011-01-24 00:00:00', 29.547, 29.547, 27.5613, 27.5613, 0),
('2011-01-25 00:00:00', 27.0053, 27.0053, 26.2905, 26.2905, 0),
('2011-01-26 00:00:00', 26.5288, 27.4025, 26.5288, 27.0053, 0),
('2011-01-27 00:00:00', 26.9259, 27.4025, 26.8465, 27.4025, 0),
('2011-01-28 00:00:00', 27.2436, 28.0379, 27.1642, 27.7996, 0),
('2011-02-08 00:00:00', 27.6407, 28.1967, 27.0847, 27.2436, 0),
('2011-02-09 00:00:00', 27.0053, 28.1173, 25.3373, 27.0053, 0),
('2011-02-10 00:00:00', 26.6876, 27.1642, 26.6082, 27.0053, 0),
('2011-02-11 00:00:00', 26.6876, 27.6407, 26.6876, 27.5613, 0),
('2011-02-14 00:00:00', 27.323, 27.879, 27.0053, 27.2436, 0),
('2011-02-15 00:00:00', 27.4025, 27.5613, 26.8465, 27.4025, 0),
('2011-02-16 00:00:00', 27.6407, 27.6407, 27.0847, 27.0847, 0),
('2011-02-17 00:00:00', 27.323, 27.323, 26.6876, 26.8465, 0),
('2011-02-18 00:00:00', 28.5144, 28.5144, 26.2905, 26.5288, 0),
('2011-02-21 00:00:00', 26.2111, 26.3699, 24.8608, 24.8608, 0),
('2011-02-22 00:00:00', 23.4311, 24.1459, 23.2722, 23.2722, 0),
('2011-02-23 00:00:00', 23.8282, 24.1459, 22.3985, 23.5105, 0),
('2011-02-24 00:00:00', 23.4311, 23.4311, 21.8425, 22.478, 0),
('2011-02-25 00:00:00', 22.3191, 23.034, 22.0014, 22.9545, 0),
('2011-02-28 00:00:00', 22.6368, 23.4311, 22.1602, 22.3985, 0),
('2011-03-01 00:00:00', 22.3985, 22.3985, 21.8425, 21.922, 0),
('2011-03-02 00:00:00', 21.8425, 21.8425, 20.5717, 20.5717, 0),
('2011-03-03 00:00:00', 20.81, 20.9688, 19.3009, 19.3009, 0),
('2011-03-04 00:00:00', 19.3803, 19.7774, 18.1889, 19.0626, 0),
('2011-03-07 00:00:00', 18.586, 19.7774, 18.586, 19.698, 0),
('2011-03-08 00:00:00', 19.8568, 20.6511, 19.8568, 20.5717, 0),
('2011-03-09 00:00:00', 20.254, 20.5717, 19.3009, 19.698, 0),
('2011-03-10 00:00:00', 19.3009, 21.1277, 19.2214, 21.1277, 0),
('2011-03-11 00:00:00', 21.8425, 22.3985, 21.7631, 22.3985, 0),
('2011-03-14 00:00:00', 22.2397, 22.2397, 20.81, 20.81, 0),
('2011-03-15 00:00:00', 20.254, 21.5248, 19.9363, 20.7306, 0),
('2011-03-16 00:00:00', 21.0483, 21.5248, 20.81, 21.366, 0),
('2011-03-17 00:00:00', 21.2071, 21.4454, 20.6511, 21.1277, 0),
('2011-03-18 00:00:00', 21.0483, 21.7631, 20.8894, 21.7631, 0),
('2011-03-21 00:00:00', 21.6837, 22.3191, 21.6043, 21.6043, 0),
('2011-03-22 00:00:00', 21.0483, 21.4454, 20.6511, 20.7306, 0),
('2011-03-23 00:00:00', 20.6511, 21.4454, 20.6511, 21.2866, 0),
('2011-03-24 00:00:00', 21.6837, 21.6837, 20.9688, 21.2866, 0),
('2011-03-25 00:00:00', 21.2071, 21.2071, 20.7306, 20.81, 0),
('2011-03-28 00:00:00', 20.7306, 21.366, 20.7306, 20.9688, 0),
('2011-03-29 00:00:00', 20.81, 20.9688, 20.0951, 20.3334, 0),
('2011-03-30 00:00:00', 19.4597, 20.0157, 19.3009, 19.8569, 0),
('2011-03-31 00:00:00', 20.0157, 20.6511, 19.7774, 19.9363, 0),
('2011-04-01 00:00:00', 20.0157, 20.254, 20.0157, 20.1746, 0),
('2011-04-04 00:00:00', 20.1746, 20.1746, 19.5391, 19.6186, 0),
('2011-04-05 00:00:00', 19.7774, 20.4128, 19.698, 20.254, 0),
('2011-04-06 00:00:00', 20.1746, 20.6511, 20.0157, 20.4923, 0),
('2011-04-07 00:00:00', 20.3334, 20.4923, 20.0951, 20.1746, 0),
('2011-04-08 00:00:00', 19.9363, 20.1746, 19.8569, 19.9363, 0),
('2011-04-13 00:00:00', 20.0157, 20.0157, 19.6186, 19.698, 0),
('2011-04-14 00:00:00', 19.8568, 19.8568, 19.4597, 19.4597, 0),
('2011-04-15 00:00:00', 19.9363, 20.0157, 19.0626, 19.142, 0),
('2011-04-18 00:00:00', 19.2214, 19.2214, 18.2683, 18.3477, 0),
('2011-04-19 00:00:00', 18.6654, 18.7449, 18.2683, 18.4272, 0),
('2011-04-20 00:00:00', 18.6654, 18.6654, 18.1889, 18.1889, 0),
('2011-04-21 00:00:00', 18.5066, 18.586, 18.1094, 18.1889, 0),
('2011-04-22 00:00:00', 18.2683, 18.2683, 17.2358, 17.7123, 0),
('2011-04-25 00:00:00', 16.362, 18.586, 16.362, 17.5535, 0),
('2011-04-26 00:00:00', 17.8712, 18.03, 17.2358, 17.3152, 0),
('2011-04-27 00:00:00', 17.474, 17.7917, 16.6798, 17.474, 0),
('2011-04-28 00:00:00', 17.474, 17.7917, 17.3946, 17.3946, 0),
('2011-04-29 00:00:00', 17.474, 17.7123, 17.474, 17.6329, 0),
('2011-05-04 00:00:00', 17.474, 17.6329, 17.0769, 17.2358, 0),
('2011-05-05 00:00:00', 17.1563, 17.1563, 16.6798, 16.6798, 0),
('2011-05-06 00:00:00', 16.8386, 16.918, 16.4415, 16.7592, 0),
('2011-05-09 00:00:00', 16.8386, 17.0769, 15.8855, 16.5209, 0),
('2011-05-10 00:00:00', 16.2826, 16.9975, 16.2826, 16.6798, 0),
('2011-05-11 00:00:00', 16.6003, 16.6003, 16.2826, 16.362, 0),
('2011-05-12 00:00:00', 16.362, 16.4415, 16.0443, 16.2032, 0),
('2011-05-13 00:00:00', 16.0443, 16.2032, 15.8855, 16.0443, 0),
('2011-05-16 00:00:00', 16.2032, 16.2032, 15.4883, 15.6472, 0),
('2011-05-17 00:00:00', 15.4883, 15.4883, 14.7735, 14.8529, 0),
('2011-05-18 00:00:00', 14.7735, 14.7735, 13.8998, 14.1381, 0),
('2011-05-19 00:00:00', 13.9792, 14.2175, 13.5027, 13.6615, 0),
('2011-05-20 00:00:00', 13.6615, 13.6615, 12.9467, 13.1849, 0),
('2011-05-23 00:00:00', 12.7084, 12.7878, 12.2318, 12.3907, 0),
('2011-05-24 00:00:00', 11.9141, 11.9141, 11.517, 11.517, 0),
('2011-05-25 00:00:00', 10.8021, 10.961, 10.7227, 10.7227, 0),
('2011-05-26 00:00:00', 10.0873, 11.4375, 10.0079, 11.1993, 0),
('2011-05-27 00:00:00', 11.4375, 11.5964, 11.3581, 11.5964, 0),
('2011-05-30 00:00:00', 11.9935, 12.073, 11.4375, 11.517, 0),
('2011-05-31 00:00:00', 11.5964, 11.9141, 11.1198, 11.6758, 0),
('2011-06-01 00:00:00', 11.517, 12.3112, 11.4375, 12.3112, 0),
('2011-06-02 00:00:00', 12.7084, 12.9467, 12.7084, 12.9467, 0),
('2011-06-03 00:00:00', 13.7409, 13.8204, 13.1055, 13.8204, 0),
('2011-06-06 00:00:00', 13.8204, 14.0587, 13.3438, 13.8998, 0),
('2011-06-07 00:00:00', 13.8998, 14.6941, 13.8998, 14.6941, 0),
('2011-06-08 00:00:00', 15.0912, 15.4089, 14.0587, 14.2969, 0),
('2011-06-09 00:00:00', 14.1381, 15.0118, 14.0587, 14.9324, 0),
('2011-06-10 00:00:00', 15.3295, 15.6472, 15.3295, 15.6472, 0),
('2011-06-13 00:00:00', 16.2032, 16.362, 15.4883, 16.1238, 0),
('2011-06-14 00:00:00', 16.2826, 16.6003, 15.0912, 15.0912, 0),
('2011-06-15 00:00:00', 15.4883, 15.5678, 14.8529, 14.8529, 0),
('2011-06-16 00:00:00', 14.9324, 15.4883, 14.2969, 15.0912, 0),
('2011-06-17 00:00:00', 15.0912, 15.4883, 13.9792, 14.2969, 0),
('2011-06-20 00:00:00', 14.4558, 14.6941, 13.9792, 14.4558, 0),
('2011-06-21 00:00:00', 14.6146, 14.7735, 14.3764, 14.6146, 0),
('2011-06-22 00:00:00', 14.9324, 15.4883, 14.9324, 15.2501, 0),
('2011-06-23 00:00:00', 15.5678, 15.5678, 14.6941, 14.7735, 0),
('2011-06-24 00:00:00', 14.9324, 15.0118, 14.6941, 14.7735, 0),
('2011-06-27 00:00:00', 14.9324, 15.0912, 14.7735, 14.8529, 0),
('2011-06-28 00:00:00', 14.9324, 15.0118, 14.2175, 14.4558, 0),
('2011-06-29 00:00:00', 14.2969, 14.2969, 13.7409, 14.1381, 0),
('2011-06-30 00:00:00', 14.0587, 14.0587, 13.5027, 13.6615, 0),
('2011-07-01 00:00:00', 13.2644, 13.3438, 12.9467, 13.1055, 0),
('2011-07-04 00:00:00', 12.8672, 13.3438, 12.8672, 13.2644, 0),
('2011-07-05 00:00:00', 13.5027, 13.9792, 13.5027, 13.9792, 0),
('2011-07-06 00:00:00', 14.2175, 14.2175, 13.6615, 13.7409, 0),
('2011-07-07 00:00:00', 13.8998, 13.9792, 13.6615, 13.7409, 0),
('2011-07-08 00:00:00', 13.9792, 13.9792, 13.5027, 13.5821, 0),
('2011-07-11 00:00:00', 13.3438, 13.5027, 13.0261, 13.1055, 0),
('2011-07-12 00:00:00', 13.1849, 13.1849, 12.5495, 13.1849, 0),
('2011-07-13 00:00:00', 13.0261, 13.1055, 12.629, 12.7878, 0),
('2011-07-14 00:00:00', 12.5495, 12.8672, 12.5495, 12.8672, 0),
('2011-07-15 00:00:00', 12.8672, 12.8672, 12.7084, 12.7084, 0),
('2011-07-18 00:00:00', 12.7084, 12.7084, 12.5495, 12.629, 0),
('2011-07-19 00:00:00', 12.4701, 12.5495, 12.2318, 12.3907, 0),
('2011-07-20 00:00:00', 12.7878, 12.7878, 12.2318, 12.5495, 0),
('2011-07-21 00:00:00', 12.5495, 12.5495, 12.2318, 12.3112, 0),
('2011-07-22 00:00:00', 12.4701, 12.4701, 12.1524, 12.2318, 0),
('2011-07-25 00:00:00', 12.073, 12.073, 11.9141, 11.9935, 0),
('2011-07-26 00:00:00', 12.2318, 12.2318, 11.5964, 11.6758, 0),
('2011-07-27 00:00:00', 11.517, 11.517, 11.2787, 11.4375, 0),
('2011-07-28 00:00:00', 11.3581, 11.6758, 11.1198, 11.1198, 0),
('2011-07-29 00:00:00', 11.3581, 11.3581, 11.1198, 11.1198, 0),
('2011-08-01 00:00:00', 11.1993, 11.1993, 10.961, 11.0404, 0),
('2011-08-02 00:00:00', 10.8816, 11.0404, 10.6433, 10.7227, 0),
('2011-08-03 00:00:00', 10.6433, 11.0404, 10.5639, 11.0404, 0),
('2011-08-04 00:00:00', 10.961, 11.517, 10.961, 11.517, 0),
('2011-08-05 00:00:00', 12.073, 12.1524, 11.4375, 11.6758, 0),
('2011-08-08 00:00:00', 11.517, 11.517, 11.0404, 11.1198, 0),
('2011-08-09 00:00:00', 11.0404, 11.0404, 10.4844, 10.5639, 0),
('2011-08-10 00:00:00', 10.5639, 11.2787, 10.5639, 11.0404, 0),
('2011-08-11 00:00:00', 10.5639, 10.961, 10.4844, 10.8816, 0),
('2011-08-12 00:00:00', 10.7227, 11.1198, 10.7227, 11.0404, 0),
('2011-08-15 00:00:00', 10.8816, 10.961, 10.7227, 10.8816, 0),
('2011-08-16 00:00:00', 10.8021, 11.1993, 10.8021, 10.961, 0),
('2011-08-17 00:00:00', 10.961, 11.6758, 10.961, 11.6758, 0),
('2011-08-18 00:00:00', 11.9141, 12.3112, 11.5964, 11.5964, 0),
('2011-08-19 00:00:00', 11.3581, 11.9141, 11.2787, 11.4375, 0),
('2011-08-22 00:00:00', 11.517, 12.3907, 11.517, 12.3907, 0),
('2011-08-23 00:00:00', 12.629, 12.7084, 11.9141, 11.9935, 0),
('2011-08-24 00:00:00', 12.1524, 12.5495, 11.6758, 11.7553, 0),
('2011-08-25 00:00:00', 12.073, 12.1524, 11.5964, 11.9141, 0),
('2011-08-26 00:00:00', 12.1524, 12.1524, 11.6758, 11.8347, 0),
('2011-08-29 00:00:00', 12.073, 12.629, 11.9141, 12.629, 0),
('2011-08-30 00:00:00', 13.1849, 13.2644, 13.0261, 13.1055, 0),
('2011-08-31 00:00:00', 13.3438, 13.4232, 12.7084, 12.8672, 0),
('2011-09-01 00:00:00', 13.2644, 13.4232, 12.8672, 13.2644, 0),
('2011-09-05 00:00:00', 13.1849, 13.1849, 12.5495, 12.7084, 0),
('2011-09-06 00:00:00', 12.7878, 12.8672, 12.073, 12.2318, 0),
('2011-09-07 00:00:00', 12.4701, 13.1055, 12.4701, 13.1055, 0),
('2011-09-08 00:00:00', 13.6615, 13.8204, 13.2644, 13.4232, 0),
('2011-09-09 00:00:00', 13.3438, 13.8204, 13.1849, 13.5821, 0),
('2011-09-12 00:00:00', 13.5027, 14.0587, 13.4232, 14.0587, 0),
('2011-09-13 00:00:00', 14.3714, 14.7892, 14.2043, 14.4549, 0),
('2011-09-14 00:00:00', 14.4549, 14.6221, 13.6194, 13.7865, 0),
('2011-09-15 00:00:00', 13.7865, 13.9536, 13.2852, 13.7029, 0),
('2011-09-16 00:00:00', 13.7865, 13.9536, 13.3687, 13.4523, 0),
('2011-09-19 00:00:00', 13.6194, 13.9536, 13.3687, 13.7865, 0),
('2011-09-20 00:00:00', 14.0372, 14.2043, 13.6194, 13.7029, 0),
('2011-09-21 00:00:00', 13.9536, 14.0372, 13.5358, 13.7865, 0),
('2011-09-22 00:00:00', 13.8701, 14.0372, 13.6194, 13.8701, 0),
('2011-09-23 00:00:00', 13.7865, 14.7892, 13.2852, 14.7892, 0),
('2011-09-26 00:00:00', 15.0398, 15.0398, 15.0398, 15.0398, 0),
('2011-09-27 00:00:00', 15.7065, 15.7065, 15.0521, 15.6247, 0),
('2011-09-28 00:00:00', 16.0425, 16.0425, 15.2905, 15.2905, 0),
('2011-09-29 00:00:00', 15.2905, 15.374, 14.5385, 14.5385, 0),
('2011-09-30 00:00:00', 14.6221, 14.6221, 13.8701, 13.9536, 0),
('2011-10-03 00:00:00', 13.7029, 13.8701, 13.3687, 13.4523, 0),
('2011-10-04 00:00:00', 13.2016, 13.7865, 13.2016, 13.7029, 0),
('2011-10-05 00:00:00', 13.8701, 14.0372, 13.5358, 13.6194, 0),
('2011-10-06 00:00:00', 13.7865, 14.2878, 13.7865, 14.0372, 0),
('2011-10-07 00:00:00', 13.7029, 14.2043, 13.6194, 13.6194, 0),
('2011-10-10 00:00:00', 13.7865, 13.7865, 13.3687, 13.5358, 0),
('2011-10-11 00:00:00', 13.7865, 13.9536, 13.5358, 13.6194, 0),
('2011-10-12 00:00:00', 13.7029, 13.7029, 12.8674, 13.0345, 0),
('2011-10-13 00:00:00', 12.951, 13.2016, 12.8674, 12.951, 0),
('2011-10-14 00:00:00', 13.2852, 13.2852, 12.951, 13.1181, 0),
('2011-10-17 00:00:00', 13.0345, 13.0345, 12.6167, 12.7838, 0),
('2011-10-18 00:00:00', 12.7003, 12.7003, 12.4496, 12.5332, 0),
('2011-10-19 00:00:00', 12.7003, 12.7838, 12.5332, 12.6167, 0),
('2011-10-20 00:00:00', 12.8674, 12.8674, 12.5332, 12.5332, 0),
('2011-10-21 00:00:00', 12.6167, 13.1181, 12.5332, 13.0345, 0),
('2011-10-24 00:00:00', 13.2016, 13.3687, 12.8674, 12.8674, 0),
('2011-10-25 00:00:00', 12.8674, 13.0345, 12.7838, 12.7838, 0),
('2011-10-26 00:00:00', 12.8674, 12.951, 12.7003, 12.8674, 0),
('2011-10-27 00:00:00', 13.0345, 13.0345, 12.8674, 13.0345, 0),
('2011-10-28 00:00:00', 13.1181, 13.7865, 13.1181, 13.7865, 0),
('2011-10-31 00:00:00', 13.8701, 14.5385, 13.5358, 13.8701, 0),
('2011-11-01 00:00:00', 13.1181, 13.7029, 13.1181, 13.2016, 0),
('2011-11-02 00:00:00', 13.1181, 13.1181, 12.6167, 12.8674, 0),
('2011-11-03 00:00:00', 13.0345, 13.1181, 12.7838, 12.951, 0),
('2011-11-04 00:00:00', 13.0345, 13.3687, 12.8674, 12.8674, 0),
('2011-11-07 00:00:00', 13.1181, 13.1181, 12.7003, 12.7003, 0),
('2011-11-08 00:00:00', 12.7003, 12.951, 12.5332, 12.951, 0),
('2011-11-09 00:00:00', 12.7838, 12.7838, 12.5332, 12.5332, 0),
('2011-11-10 00:00:00', 12.3661, 12.3661, 12.1154, 12.1154, 0),
('2011-11-11 00:00:00', 12.3661, 12.5332, 12.0319, 12.0319, 0),
('2011-11-14 00:00:00', 12.0319, 12.0319, 11.5305, 11.6976, 0),
('2011-11-15 00:00:00', 11.7812, 11.9483, 11.5305, 11.5305, 0),
('2011-11-16 00:00:00', 11.3634, 11.9483, 11.2799, 11.7812, 0),
('2011-11-17 00:00:00', 11.8647, 11.8647, 11.2799, 11.2799, 0),
('2011-11-18 00:00:00', 11.1128, 11.1963, 10.7785, 10.9457, 0),
('2011-11-21 00:00:00', 11.0292, 11.1128, 10.8621, 10.8621, 0),
('2011-11-22 00:00:00', 10.8621, 11.0292, 10.695, 10.9457, 0),
('2011-11-23 00:00:00', 11.1963, 11.3634, 11.0292, 11.1963, 0),
('2011-11-24 00:00:00', 11.2799, 11.3634, 10.9457, 10.9457, 0),
('2011-11-25 00:00:00', 11.0292, 11.1963, 10.9457, 11.1128, 0),
('2011-11-28 00:00:00', 11.2799, 11.6141, 11.2799, 11.2799, 0),
('2011-11-29 00:00:00', 11.5305, 11.6141, 11.2799, 11.3634, 0),
('2011-11-30 00:00:00', 11.447, 11.5305, 11.1128, 11.1963, 0),
('2011-12-01 00:00:00', 11.447, 11.5305, 11.1963, 11.2799, 0),
('2011-12-02 00:00:00', 11.3634, 11.3634, 10.6114, 11.2799, 0),
('2011-12-05 00:00:00', 11.447, 11.8647, 11.447, 11.8647, 0),
('2011-12-06 00:00:00', 11.9483, 12.0319, 11.6141, 11.6141, 0),
('2011-12-07 00:00:00', 11.5305, 11.7812, 11.447, 11.6976, 0),
('2011-12-08 00:00:00', 11.447, 11.7812, 11.3634, 11.5305, 0),
('2011-12-09 00:00:00', 11.447, 11.6141, 11.2799, 11.2799, 0),
('2011-12-12 00:00:00', 11.2799, 11.3634, 10.9457, 11.0292, 0),
('2011-12-13 00:00:00', 11.0292, 11.1963, 10.6114, 10.6114, 0),
('2011-12-14 00:00:00', 10.695, 10.695, 10.2772, 10.4443, 0),
('2011-12-15 00:00:00', 10.2772, 10.2772, 9.77589, 10.0266, 0),
('2011-12-16 00:00:00', 10.1937, 10.5279, 10.1101, 10.4443, 0),
('2011-12-19 00:00:00', 10.4443, 10.6114, 10.1937, 10.2772, 0),
('2011-12-20 00:00:00', 10.1937, 10.1937, 9.85944, 9.94299, 0),
('2011-12-21 00:00:00', 10.0266, 10.1937, 9.85944, 10.0266, 0),
('2011-12-22 00:00:00', 10.1937, 10.1937, 9.52522, 9.52522, 0),
('2011-12-23 00:00:00', 9.35811, 9.44167, 9.10745, 9.35811, 0),
('2011-12-26 00:00:00', 9.191, 9.191, 8.94034, 9.02389, 0),
('2011-12-27 00:00:00', 8.77323, 9.191, 8.60612, 8.77323, 0),
('2011-12-28 00:00:00', 8.77323, 9.35811, 8.77323, 9.35811, 0),
('2011-12-29 00:00:00', 9.10745, 9.35811, 8.94034, 9.10745, 0),
('2011-12-30 00:00:00', 9.44167, 9.60878, 9.191, 9.44167, 0),
('2012-01-03 00:00:00', 9.52522, 9.69233, 9.44167, 9.60878, 61100),
('2012-01-04 00:00:00', 9.77588, 9.85944, 9.60878, 9.77588, 107100),
('2012-01-05 00:00:00', 9.69233, 9.69233, 9.52522, 9.69233, 47900),
('2012-01-06 00:00:00', 9.44167, 9.60877, 9.35811, 9.52522, 42500),
('2012-01-09 00:00:00', 9.60878, 9.69233, 9.44167, 9.69233, 71200),
('2012-01-10 00:00:00', 9.60878, 10.2772, 9.60878, 10.1937, 119900),
('2012-01-11 00:00:00', 10.2772, 10.3608, 9.94299, 10.0266, 83900),
('2012-01-12 00:00:00', 9.85944, 10.0266, 9.85944, 9.94299, 55300),
('2012-01-13 00:00:00', 9.94299, 10.1937, 9.94299, 10.0266, 92600),
('2012-01-16 00:00:00', 10.1101, 10.5279, 10.1101, 10.2772, 114600),
('2012-01-17 00:00:00', 10.3608, 10.5279, 9.94299, 10.1101, 37400),
('2012-01-18 00:00:00', 10.1937, 10.2772, 10.1937, 10.2772, 45100),
('2012-01-19 00:00:00', 10.3608, 10.8621, 10.3608, 10.695, 71000),
('2012-01-20 00:00:00', 11.0292, 11.0292, 10.4443, 10.5279, 41400),
('2012-01-30 00:00:00', 10.695, 10.8621, 10.3608, 10.695, 68200),
('2012-01-31 00:00:00', 10.6114, 11.2799, 10.6114, 11.0292, 314800),
('2012-02-01 00:00:00', 11.0292, 11.2799, 10.9457, 11.2799, 87700),
('2012-02-02 00:00:00', 11.2799, 11.8647, 11.2799, 11.8647, 132000),
('2012-02-03 00:00:00', 12.1154, 12.1154, 11.0292, 11.2799, 248600),
('2012-02-06 00:00:00', 11.3634, 11.3634, 10.7785, 10.9457, 243200),
('2012-02-07 00:00:00', 11.2799, 11.6141, 11.0292, 11.3634, 196500),
('2012-02-08 00:00:00', 11.3634, 11.9483, 11.3634, 11.9483, 533900),
('2012-02-09 00:00:00', 11.9483, 12.4496, 11.9483, 12.0319, 495000),
('2012-02-10 00:00:00', 12.0319, 12.0319, 11.5305, 11.6141, 324700),
('2012-02-13 00:00:00', 11.6141, 11.6141, 11.1963, 11.2799, 174100),
('2012-02-14 00:00:00', 11.2799, 11.7812, 11.2799, 11.6141, 218400),
('2012-02-15 00:00:00', 11.6976, 11.6976, 11.1963, 11.447, 75800),
('2012-02-16 00:00:00', 11.3634, 11.6141, 11.1963, 11.447, 81600),
('2012-02-17 00:00:00', 11.6976, 11.8647, 11.5305, 11.7812, 125200),
('2012-02-20 00:00:00', 12.1154, 12.5332, 12.1154, 12.5332, 293500),
('2012-02-21 00:00:00', 13.2016, 13.3687, 12.7003, 12.7838, 0),
('2012-02-22 00:00:00', 12.6167, 13.4523, 12.6167, 13.2852, 262900),
('2012-02-23 00:00:00', 13.7029, 13.7865, 13.1181, 13.7865, 323600),
('2012-02-24 00:00:00', 13.6194, 14.4549, 13.6194, 13.9536, 346300),
('2012-02-27 00:00:00', 14.3714, 14.6221, 13.7865, 14.5385, 436000),
('2012-02-28 00:00:00', 14.7056, 14.7056, 13.5358, 13.5358, 302900),
('2012-02-29 00:00:00', 13.7029, 13.9536, 13.4523, 13.8701, 189200),
('2012-03-01 00:00:00', 13.7865, 13.9536, 13.5358, 13.7865, 243200),
('2012-03-02 00:00:00', 13.8701, 14.7056, 13.7865, 14.7056, 462600),
('2012-03-05 00:00:00', 15.2905, 15.4576, 15.2905, 15.4576, 257900),
('2012-03-06 00:00:00', 16.2931, 16.4603, 14.9563, 15.2069, 546500),
('2012-03-07 00:00:00', 15.0398, 15.2905, 14.6221, 15.0398, 222900),
('2012-03-08 00:00:00', 15.591, 15.8552, 14.6221, 14.6221, 478500),
('2012-03-09 00:00:00', 14.2043, 14.4549, 13.5358, 14.4549, 256500),
('2012-03-12 00:00:00', 14.4549, 14.9563, 14.2043, 14.9563, 774700),
('2012-03-13 00:00:00', 15.0398, 15.7918, 14.2043, 14.7892, 71200),
('2012-03-14 00:00:00', 14.6221, 15.2069, 14.3714, 14.3714, 103200),
('2012-03-15 00:00:00', 14.5385, 15.2069, 14.1207, 15.1234, 364600),
('2012-03-16 00:00:00', 15.1234, 15.4576, 14.7892, 15.0398, 523900),
('2012-03-19 00:00:00', 14.9563, 15.374, 14.7892, 15.1234, 125100),
('2012-03-20 00:00:00', 15.2905, 15.2905, 14.9563, 15.0398, 302500),
('2012-03-21 00:00:00', 15.2069, 16.126, 15.2069, 16.126, 826800),
('2012-03-22 00:00:00', 15.8754, 16.9616, 15.8754, 16.9616, 672400),
('2012-03-23 00:00:00', 17.2122, 17.8807, 17.2122, 17.8807, 473300),
('2012-03-26 00:00:00', 18.8833, 18.9669, 18.2149, 18.9669, 394300),
('2012-03-27 00:00:00', 18.9669, 18.9669, 17.7136, 17.7136, 551000),
('2012-03-28 00:00:00', 16.9616, 17.9642, 16.5438, 17.7136, 551900),
('2012-03-29 00:00:00', 17.9642, 17.9642, 16.3767, 16.3767, 556300),
('2012-03-30 00:00:00', 16.2931, 16.7109, 15.5412, 16.7109, 234900),
('2012-04-03 00:00:00', 16.126, 17.2122, 16.126, 17.2122, 134000),
('2012-04-04 00:00:00', 17.4629, 17.7136, 16.2931, 16.7109, 197600),
('2012-04-05 00:00:00', 16.7109, 17.5465, 16.2931, 17.4629, 199800),
('2012-04-06 00:00:00', 17.3794, 17.7971, 17.1287, 17.1287, 221600),
('2012-04-09 00:00:00', 17.3794, 18.2149, 16.7945, 17.7971, 309100),
('2012-04-10 00:00:00', 17.8807, 17.9642, 17.1287, 17.4629, 333500),
('2012-04-11 00:00:00', 18.1313, 18.2985, 17.5465, 18.0478, 312900),
('2012-04-12 00:00:00', 17.7971, 18.6327, 17.7136, 17.8807, 272600),
('2012-04-13 00:00:00', 17.7971, 17.9642, 17.3794, 17.7136, 356200),
('2012-04-16 00:00:00', 17.7136, 18.6327, 17.4629, 18.2149, 293100),
('2012-04-17 00:00:00', 18.5491, 18.6327, 17.9642, 18.0478, 425600),
('2012-04-18 00:00:00', 18.2149, 18.4656, 17.7971, 17.9642, 325700),
('2012-04-19 00:00:00', 17.7971, 17.8807, 16.878, 16.9616, 310900),
('2012-04-20 00:00:00', 17.2958, 17.5465, 16.878, 17.2958, 118300),
('2012-04-23 00:00:00', 17.4629, 17.7136, 17.1287, 17.2122, 56700),
('2012-04-24 00:00:00', 17.4629, 17.5465, 16.878, 17.5465, 144500),
('2012-04-25 00:00:00', 17.8807, 18.382, 17.7971, 18.0478, 292500),
('2012-04-26 00:00:00', 18.0478, 18.0478, 17.4629, 17.5465, 138600),
('2012-04-27 00:00:00', 17.9642, 18.7162, 17.9642, 18.7162, 227500),
('2012-05-02 00:00:00', 19.9695, 19.9695, 19.6353, 19.9695, 1444400),
('2012-05-03 00:00:00', 20.8886, 21.1393, 19.2176, 19.886, 375300),
('2012-05-04 00:00:00', 20.0531, 20.5544, 19.6353, 20.0531, 278200),
('2012-05-07 00:00:00', 20.2202, 21.1393, 20.1367, 21.1393, 369000),
('2012-05-08 00:00:00', 21.0557, 21.6406, 20.4709, 20.638, 552900),
('2012-05-09 00:00:00', 20.8886, 21.2229, 20.5544, 20.638, 431800),
('2012-05-10 00:00:00', 21.1393, 21.1393, 20.2202, 20.2202, 487900),
('2012-05-11 00:00:00', 20.638, 20.638, 19.2176, 19.3847, 454900),
('2012-05-14 00:00:00', 19.134, 19.3847, 17.9642, 17.9642, 462400),
('2012-05-15 00:00:00', 17.9642, 18.2149, 17.1287, 17.3794, 278400),
('2012-05-16 00:00:00', 17.9642, 18.0478, 16.9616, 18.0478, 251500),
('2012-05-17 00:00:00', 18.2985, 18.382, 17.2958, 17.2958, 195000),
('2012-05-18 00:00:00', 17.4629, 17.4629, 16.2931, 16.2931, 273000),
('2012-05-21 00:00:00', 16.7109, 17.5465, 16.7109, 17.5465, 168600),
('2012-05-22 00:00:00', 17.7136, 17.9642, 17.2122, 17.3794, 189500),
('2012-05-23 00:00:00', 17.0451, 17.2122, 16.126, 16.126, 298400),
('2012-05-24 00:00:00', 16.3767, 16.3767, 15.0398, 16.0425, 247400),
('2012-05-25 00:00:00', 15.8754, 16.7945, 15.8754, 16.7945, 130200),
('2012-05-28 00:00:00', 17.9642, 17.9642, 16.4603, 16.5438, 133400),
('2012-05-29 00:00:00', 16.7109, 17.7136, 16.2931, 16.9616, 204100),
('2012-05-30 00:00:00', 16.7109, 17.3794, 16.7109, 16.9616, 79200),
('2012-05-31 00:00:00', 16.5438, 16.7945, 16.126, 16.2096, 199700),
('2012-06-01 00:00:00', 16.5438, 16.6274, 15.9589, 16.3767, 58000),
('2012-06-04 00:00:00', 16.2096, 16.2096, 15.2069, 15.374, 212200),
('2012-06-05 00:00:00', 15.374, 16.126, 15.2069, 15.9589, 116700),
('2012-06-06 00:00:00', 16.0425, 16.3767, 15.8754, 16.3767, 121100),
('2012-06-07 00:00:00', 16.2931, 17.1287, 16.2931, 17.1287, 282100),
('2012-06-08 00:00:00', 17.5465, 17.9642, 17.0451, 17.3794, 270100),
('2012-06-11 00:00:00', 17.4629, 17.7971, 17.1287, 17.63, 154300),
('2012-06-12 00:00:00', 16.3767, 17.8807, 16.3767, 16.7109, 282000),
('2012-06-13 00:00:00', 16.7945, 16.9616, 16.2096, 16.6274, 179400),
('2012-06-14 00:00:00', 16.5438, 16.6274, 15.9589, 16.2096, 126300),
('2012-06-15 00:00:00', 16.126, 16.5438, 16.126, 16.2096, 121500),
('2012-06-18 00:00:00', 16.6274, 16.878, 16.2931, 16.3767, 98300),
('2012-06-19 00:00:00', 16.6274, 16.7109, 16.126, 16.2096, 84100),
('2012-06-20 00:00:00', 16.2931, 16.2931, 16.0425, 16.2096, 38500),
('2012-06-21 00:00:00', 16.0425, 16.2931, 16.0425, 16.126, 89500),
('2012-06-22 00:00:00', 15.9589, 16.0425, 15.6247, 15.7918, 137300),
('2012-06-25 00:00:00', 15.7918, 15.7918, 14.9563, 15.0398, 184600),
('2012-06-26 00:00:00', 14.9563, 14.9563, 14.0372, 14.3714, 204400),
('2012-06-27 00:00:00', 14.4549, 14.5385, 14.0372, 14.0372, 129800),
('2012-06-28 00:00:00', 14.0372, 14.4549, 13.3687, 14.4549, 133700),
('2012-06-29 00:00:00', 14.5385, 14.5385, 14.1207, 14.1207, 60600),
('2012-07-02 00:00:00', 14.3714, 14.3714, 13.7865, 13.8701, 80400),
('2012-07-03 00:00:00', 13.7029, 13.7029, 12.951, 13.0345, 196900),
('2012-07-04 00:00:00', 13.2016, 13.3687, 12.3661, 12.3661, 184200),
('2012-07-05 00:00:00', 12.7838, 13.2852, 12.3661, 13.2852, 196300),
('2012-07-06 00:00:00', 13.6194, 14.2043, 13.4523, 14.2043, 432200),
('2012-07-09 00:00:00', 14.2043, 14.2043, 13.7029, 13.7865, 161900),
('2012-07-10 00:00:00', 13.5358, 14.0372, 13.5358, 13.7865, 104500),
('2012-07-11 00:00:00', 13.7865, 14.2878, 13.7029, 14.1207, 244500),
('2012-07-12 00:00:00', 14.2878, 14.5385, 14.0372, 14.4549, 149800),
('2012-07-13 00:00:00', 14.4549, 15.2069, 14.4549, 14.8727, 194400),
('2012-07-16 00:00:00', 15.0398, 15.374, 14.6221, 14.8727, 132800),
('2012-07-17 00:00:00', 14.9563, 15.2905, 14.8727, 15.2069, 67400),
('2012-07-18 00:00:00', 15.1234, 15.2069, 14.6221, 15.2069, 154900),
('2012-07-19 00:00:00', 15.1234, 15.8754, 15.0398, 15.7918, 170400),
('2012-07-20 00:00:00', 15.9589, 16.7109, 15.4576, 15.5412, 285300),
('2012-07-23 00:00:00', 15.5412, 15.6247, 15.0398, 15.2905, 90300),
('2012-07-24 00:00:00', 15.1234, 15.1234, 14.5385, 14.6221, 270200),
('2012-07-25 00:00:00', 14.8727, 14.8727, 14.5385, 14.7056, 106700),
('2012-07-26 00:00:00', 14.7892, 15.0398, 14.6221, 14.7056, 138400),
('2012-07-27 00:00:00', 15.1234, 15.1234, 14.7056, 14.7892, 79400),
('2012-07-30 00:00:00', 14.6221, 15.0398, 14.6221, 14.7892, 48700),
('2012-07-31 00:00:00', 14.9563, 15.1234, 14.8727, 14.9563, 87000),
('2012-08-01 00:00:00', 14.9563, 14.9563, 14.6221, 14.8727, 59100),
('2012-08-02 00:00:00', 14.9563, 15.0398, 14.8727, 14.9563, 32600),
('2012-08-03 00:00:00', 14.8727, 14.9563, 14.7892, 14.9563, 22500),
('2012-08-06 00:00:00', 14.9563, 15.4576, 14.9563, 15.374, 89200),
('2012-08-07 00:00:00', 15.374, 15.374, 14.7892, 14.9563, 82000),
('2012-08-08 00:00:00', 15.0398, 15.2069, 14.9563, 15.2069, 47500),
('2012-08-09 00:00:00', 15.2905, 15.4576, 15.2069, 15.2905, 95300),
('2012-08-10 00:00:00', 15.0398, 15.2905, 15.0398, 15.1234, 49900),
('2012-08-13 00:00:00', 15.924, 15.924, 14.8565, 15.1234, 27900),
('2012-08-14 00:00:00', 15.2123, 15.3013, 15.0344, 15.1234, 66000),
('2012-08-15 00:00:00', 15.2123, 15.3013, 14.9454, 15.1234, 70600),
('2012-08-16 00:00:00', 15.1234, 15.2123, 14.9454, 15.1234, 54400),
('2012-08-17 00:00:00', 15.1234, 15.2123, 14.9454, 15.1234, 80600),
('2012-08-20 00:00:00', 15.3013, 16.1019, 15.1234, 16.1019, 819200),
('2012-08-21 00:00:00', 17.1695, 17.1695, 15.0344, 15.0344, 331500),
('2012-08-22 00:00:00', 15.0344, 16.013, 15.0344, 15.5682, 491600),
('2012-08-23 00:00:00', 15.4792, 15.4792, 14.4117, 14.4117, 95600),
('2012-08-24 00:00:00', 13.611, 15.2123, 13.4331, 14.5007, 449700),
('2012-08-27 00:00:00', 14.5896, 14.5896, 13.611, 13.611, 199600),
('2012-08-28 00:00:00', 12.7214, 13.611, 12.7214, 12.8994, 184900),
('2012-08-29 00:00:00', 13.4331, 13.789, 12.9883, 13.789, 230600),
('2012-08-30 00:00:00', 14.0558, 14.0558, 13.611, 13.7, 241500),
('2012-08-31 00:00:00', 14.4, 14.4, 13.6, 14.1, 155200),
('2012-09-04 00:00:00', 14.1, 14.6, 14, 14.4, 184700),
('2012-09-05 00:00:00', 14.5, 14.5, 13.9, 14.1, 150700),
('2012-09-06 00:00:00', 14, 14, 13.5, 13.5, 174200),
('2012-09-07 00:00:00', 13.7, 13.9, 13.2, 13.5, 176000),
('2012-09-10 00:00:00', 13.5, 13.5, 12.6, 12.9, 361600),
('2012-09-11 00:00:00', 12.2, 13.1, 12.2, 12.8, 86500),
('2012-09-12 00:00:00', 13.2, 13.4, 12.8, 13, 92900),
('2012-09-13 00:00:00', 13.1, 13.4, 12.8, 13.4, 101800),
('2012-09-14 00:00:00', 13.6, 14, 13.6, 13.9, 308600),
('2012-09-17 00:00:00', 13.6, 14, 13.5, 13.5, 180000),
('2012-09-18 00:00:00', 13.2, 13.6, 12.8, 12.8, 154400),
('2012-09-19 00:00:00', 12.7, 13.4, 12.4, 13.3, 154000),
('2012-09-20 00:00:00', 13.2, 13.3, 12.7, 13.1, 119900),
('2012-09-21 00:00:00', 13.1, 13.3, 13, 13.3, 85600),
('2012-09-24 00:00:00', 13.4, 13.4, 12.7, 12.8, 78700),
('2012-09-25 00:00:00', 13, 13.1, 12.8, 13.1, 69400),
('2012-09-26 00:00:00', 13, 13.2, 13, 13.1, 97000),
('2012-09-27 00:00:00', 12.2, 13.1, 12.2, 12.8, 86700),
('2012-09-28 00:00:00', 12.7, 12.9, 12.7, 12.9, 26700),
('2012-10-01 00:00:00', 12.8, 12.9, 12.4, 12.7, 145600),
('2012-10-02 00:00:00', 12.3, 12.7, 12.3, 12.5, 86700),
('2012-10-03 00:00:00', 12.8, 13, 12.5, 12.7, 65600),
('2012-10-04 00:00:00', 12.7, 12.8, 12.6, 12.7, 21200),
('2012-10-05 00:00:00', 12.8, 12.9, 12.6, 12.9, 81100),
('2012-10-08 00:00:00', 12.8, 13.4, 12.8, 13.3, 206900),
('2012-10-09 00:00:00', 13.1, 13.4, 12.9, 13.1, 106600),
('2012-10-10 00:00:00', 13, 13.5, 13, 13.5, 165800),
('2012-10-11 00:00:00', 13.5, 14.2, 13.5, 14.2, 631000),
('2012-10-12 00:00:00', 13.5, 14.7, 13.5, 14.5, 698500),
('2012-10-15 00:00:00', 14.4, 14.6, 13.9, 13.9, 746400),
('2012-10-16 00:00:00', 14, 14.6, 13.9, 14.6, 523100),
('2012-10-17 00:00:00', 14.5, 14.5, 13.8, 13.9, 384400),
('2012-10-18 00:00:00', 13.9, 14, 13.6, 13.7, 476900),
('2012-10-19 00:00:00', 13.5, 13.6, 13, 13.3, 550000),
('2012-10-22 00:00:00', 13.2, 13.3, 12.7, 12.8, 538600),
('2012-10-23 00:00:00', 13, 13.4, 12.8, 13.4, 332300),
('2012-10-24 00:00:00', 13.5, 13.5, 13, 13.1, 137600),
('2012-10-25 00:00:00', 13, 13.1, 12.8, 12.9, 272500),
('2012-10-26 00:00:00', 13, 13, 12.8, 12.9, 279200),
('2012-10-29 00:00:00', 12.9, 13, 12.9, 12.9, 86500),
('2012-10-30 00:00:00', 12.9, 13, 12.6, 12.8, 250100),
('2012-10-31 00:00:00', 12.6, 12.7, 12.4, 12.6, 223700),
('2012-11-01 00:00:00', 12.6, 12.9, 12.6, 12.8, 138500),
('2012-11-02 00:00:00', 12.5, 12.6, 12.1, 12.2, 522100),
('2012-11-05 00:00:00', 12.2, 12.4, 12.1, 12.3, 66500),
('2012-11-06 00:00:00', 12.3, 12.5, 12.2, 12.3, 270000),
('2012-11-07 00:00:00', 12.5, 12.8, 12.4, 12.6, 79900),
('2012-11-08 00:00:00', 12.5, 12.6, 12.2, 12.6, 189500),
('2012-11-09 00:00:00', 12.5, 12.6, 12.4, 12.5, 412300),
('2012-11-12 00:00:00', 12.7, 13.1, 12.6, 13, 541000),
('2012-11-13 00:00:00', 13, 13, 12.7, 12.7, 93800),
('2012-11-14 00:00:00', 12.7, 12.8, 12.6, 12.6, 238800),
('2012-11-15 00:00:00', 12.7, 12.9, 12.5, 12.5, 241000),
('2012-11-16 00:00:00', 12.6, 12.7, 12.4, 12.6, 81800),
('2012-11-19 00:00:00', 12.6, 12.7, 12.4, 12.5, 69300),
('2012-11-20 00:00:00', 12.5, 12.6, 12.4, 12.5, 311700),
('2012-11-21 00:00:00', 12.5, 12.5, 12.4, 12.4, 130000),
('2012-11-22 00:00:00', 12.4, 12.5, 12.4, 12.5, 60800),
('2012-11-23 00:00:00', 12.5, 12.5, 12.4, 12.4, 81400),
('2012-11-26 00:00:00', 12.4, 12.4, 12.3, 12.3, 191800),
('2012-11-27 00:00:00', 12.2, 12.7, 12.1, 12.6, 207600),
('2012-11-28 00:00:00', 12.5, 12.7, 12.5, 12.6, 316700),
('2012-11-29 00:00:00', 12.7, 13.3, 12.7, 13.1, 1018300),
('2012-11-30 00:00:00', 13.2, 13.2, 12.8, 12.9, 153800),
('2012-12-03 00:00:00', 12.9, 13, 12.7, 13, 113000),
('2012-12-04 00:00:00', 13, 13.5, 12.9, 13.3, 414500),
('2012-12-05 00:00:00', 13.4, 13.6, 13.2, 13.3, 380100),
('2012-12-06 00:00:00', 13.2, 13.3, 13.1, 13.2, 149900),
('2012-12-07 00:00:00', 13.1, 13.3, 13, 13.1, 158300),
('2012-12-10 00:00:00', 13.1, 13.8, 13.1, 13.5, 367200),
('2012-12-11 00:00:00', 13.4, 13.7, 13.2, 13.3, 223700),
('2012-12-12 00:00:00', 13.2, 13.7, 13.1, 13.6, 238700),
('2012-12-13 00:00:00', 13.5, 14, 13.4, 13.7, 455900),
('2012-12-14 00:00:00', 13.8, 13.8, 13.4, 13.5, 312900),
('2012-12-17 00:00:00', 13, 13.7, 12.6, 13.3, 246800),
('2012-12-18 00:00:00', 13.3, 13.3, 13, 13.1, 403100),
('2012-12-19 00:00:00', 13.3, 13.5, 13, 13.3, 347800),
('2012-12-20 00:00:00', 13.4, 13.5, 13, 13.1, 272300),
('2012-12-21 00:00:00', 12.9, 13.3, 12.9, 13.1, 106900),
('2012-12-24 00:00:00', 13.1, 14, 13.1, 13.7, 461900),
('2012-12-25 00:00:00', 13.6, 13.6, 13.3, 13.3, 273800),
('2012-12-26 00:00:00', 13.4, 13.7, 13.2, 13.7, 364800),
('2012-12-27 00:00:00', 13.6, 13.9, 13.4, 13.6, 744100),
('2012-12-28 00:00:00', 13.5, 13.9, 13.3, 13.9, 387700),
('2013-01-02 00:00:00', 13.9, 14.7, 13.9, 14.5, 774100),
('2013-01-03 00:00:00', 14.6, 14.6, 13.9, 14.1, 766100),
('2013-01-04 00:00:00', 14, 14.5, 13.9, 14.3, 478300),
('2013-01-07 00:00:00', 14.4, 14.6, 14.1, 14.2, 748000),
('2013-01-08 00:00:00', 14, 14.4, 14, 14.2, 468900),
('2013-01-09 00:00:00', 14.2, 15.1, 14.1, 14.4, 1361600),
('2013-01-10 00:00:00', 14.3, 15, 14.2, 14.8, 472700),
('2013-01-11 00:00:00', 15, 15.3, 14.7, 14.7, 451600),
('2013-01-14 00:00:00', 14.7, 14.7, 14.3, 14.5, 330500),
('2013-01-15 00:00:00', 14.5, 14.9, 14.5, 14.8, 486900),
('2013-01-16 00:00:00', 15.1, 15.2, 14.6, 14.8, 884200),
('2013-01-17 00:00:00', 14.7, 14.9, 14.6, 14.6, 477900),
('2013-01-18 00:00:00', 14.6, 14.6, 14.1, 14.2, 577200),
('2013-01-21 00:00:00', 14.5, 14.5, 14.1, 14.2, 300500),
('2013-01-22 00:00:00', 14.2, 14.2, 13.7, 13.7, 378400),
('2013-01-23 00:00:00', 13.8, 13.9, 13.5, 13.6, 219500),
('2013-01-24 00:00:00', 13.8, 14.1, 13.6, 14, 162300),
('2013-01-25 00:00:00', 14.2, 14.2, 14, 14.1, 303800),
('2013-01-28 00:00:00', 14.4, 14.6, 14.1, 14.2, 676000),
('2013-01-29 00:00:00', 14.3, 14.8, 14.2, 14.7, 648400),
('2013-01-30 00:00:00', 14.8, 14.9, 14.7, 14.7, 351700),
('2013-01-31 00:00:00', 14.7, 14.7, 14.2, 14.3, 249100),
('2013-02-01 00:00:00', 14.3, 14.7, 14.3, 14.5, 230600),
('2013-02-04 00:00:00', 14.5, 14.5, 14.2, 14.4, 349400),
('2013-02-05 00:00:00', 14.4, 14.4, 14.2, 14.2, 164500),
('2013-02-06 00:00:00', 14.2, 14.5, 14.2, 14.5, 218800),
('2013-02-07 00:00:00', 14.5, 14.6, 14.4, 14.5, 396000),
('2013-02-08 00:00:00', 14.7, 14.7, 14.4, 14.6, 817100),
('2013-02-18 00:00:00', 14.8, 15.2, 14.7, 15, 795500),
('2013-02-19 00:00:00', 15.2, 16.3, 14.9, 15.9, 2064700),
('2013-02-20 00:00:00', 15.7, 15.9, 15.7, 15.8, 1150300),
('2013-02-21 00:00:00', 15.9, 15.9, 14.3, 14.3, 1234700),
('2013-02-22 00:00:00', 14.5, 15.1, 14, 14.5, 895500),
('2013-02-25 00:00:00', 14.8, 15, 14.5, 14.9, 490300),
('2013-02-26 00:00:00', 14.9, 14.9, 14, 14.3, 686200),
('2013-02-27 00:00:00', 14.1, 14.4, 14, 14.3, 317600),
('2013-02-28 00:00:00', 14.5, 14.7, 14.4, 14.4, 447400),
('2013-03-01 00:00:00', 14.5, 14.6, 14.2, 14.4, 310600),
('2013-03-04 00:00:00', 14.4, 14.4, 13.8, 13.8, 694700),
('2013-03-05 00:00:00', 13.8, 14.1, 13.5, 13.6, 278800),
('2013-03-06 00:00:00', 13.8, 13.9, 13.6, 13.8, 219400),
('2013-03-07 00:00:00', 13.9, 13.9, 13.5, 13.6, 205700),
('2013-03-08 00:00:00', 13.8, 13.9, 13.7, 13.9, 100900),
('2013-03-11 00:00:00', 14, 14.3, 13.8, 14.2, 299700),
('2013-03-12 00:00:00', 14.3, 14.3, 13.8, 14, 245800),
('2013-03-13 00:00:00', 14, 14, 13.6, 13.8, 185100),
('2013-03-14 00:00:00', 13.8, 13.9, 13.7, 13.8, 59200),
('2013-03-15 00:00:00', 14, 14, 13.7, 13.9, 194100),
('2013-03-18 00:00:00', 14, 14, 13.7, 13.8, 133300),
('2013-03-19 00:00:00', 13.7, 13.8, 13.6, 13.8, 55900),
('2013-03-20 00:00:00', 13.8, 13.9, 13.7, 13.8, 117800),
('2013-03-21 00:00:00', 13.8, 14, 13.7, 13.9, 218800),
('2013-03-22 00:00:00', 13.7, 14, 13.5, 13.7, 244100),
('2013-03-25 00:00:00', 13.6, 13.8, 13.6, 13.8, 192800),
('2013-03-26 00:00:00', 13.8, 13.8, 13.6, 13.7, 178000),
('2013-03-27 00:00:00', 13.7, 13.7, 13.5, 13.7, 92100),
('2013-03-28 00:00:00', 13.6, 13.7, 13.5, 13.5, 206800),
('2013-03-29 00:00:00', 13.4, 13.4, 13.1, 13.4, 183400),
('2013-04-01 00:00:00', 13.2, 13.9, 13.2, 13.9, 136800),
('2013-04-02 00:00:00', 13.9, 14, 13.7, 13.7, 172500),
('2013-04-03 00:00:00', 13.7, 13.8, 13.5, 13.7, 258900),
('2013-04-04 00:00:00', 13.7, 13.7, 13.5, 13.7, 90200),
('2013-04-05 00:00:00', 13.6, 14.2, 13.6, 14, 480900),
('2013-04-08 00:00:00', 14.2, 14.4, 14.1, 14.4, 565900),
('2013-04-09 00:00:00', 14.7, 15, 14.5, 14.9, 840700),
('2013-04-10 00:00:00', 14.9, 14.9, 14.3, 14.3, 508200),
('2013-04-11 00:00:00', 14.3, 14.4, 14.2, 14.4, 272200),
('2013-04-12 00:00:00', 14.3, 14.4, 13.9, 14, 357000),
('2013-04-15 00:00:00', 14, 14, 13.6, 13.6, 326800),
('2013-04-16 00:00:00', 13.5, 13.8, 13.4, 13.7, 312700),
('2013-04-17 00:00:00', 13.8, 13.9, 13.7, 13.9, 106400),
('2013-04-18 00:00:00', 13.9, 13.9, 13.5, 13.6, 130500),
('2013-04-22 00:00:00', 13.8, 13.8, 13.3, 13.4, 182400),
('2013-04-23 00:00:00', 13.4, 13.6, 13.4, 13.5, 158900),
('2013-04-24 00:00:00', 13.5, 13.6, 13.4, 13.5, 104400),
('2013-04-25 00:00:00', 13.6, 13.7, 13.5, 13.7, 112900),
('2013-04-26 00:00:00', 13.6, 13.6, 13.5, 13.6, 96500),
('2013-05-02 00:00:00', 13.5, 13.6, 13.4, 13.5, 102100),
('2013-05-06 00:00:00', 14, 14.2, 13.8, 14.1, 204200),
('2013-05-07 00:00:00', 14.1, 14.1, 13.7, 13.8, 323300),
('2013-05-08 00:00:00', 13.8, 13.9, 13.7, 13.8, 112800),
('2013-05-09 00:00:00', 13.9, 14, 13.8, 13.9, 213900),
('2013-05-10 00:00:00', 13.9, 13.9, 13.6, 13.9, 204800),
('2013-05-13 00:00:00', 13.9, 14, 13.8, 13.9, 131300),
('2013-05-14 00:00:00', 13.9, 13.9, 13.6, 13.6, 171300),
('2013-05-15 00:00:00', 13.7, 13.8, 13.6, 13.7, 179100),
('2013-05-16 00:00:00', 13.8, 14, 13.8, 13.9, 325900),
('2013-05-17 00:00:00', 13.9, 14.3, 13.9, 14, 325900),
('2013-05-20 00:00:00', 14.1, 14.2, 14, 14.1, 154700),
('2013-05-21 00:00:00', 14.3, 14.4, 14.1, 14.2, 433000),
('2013-05-22 00:00:00', 14.3, 14.7, 14.3, 14.5, 639300),
('2013-05-23 00:00:00', 14.5, 14.6, 14.1, 14.3, 349300),
('2013-05-24 00:00:00', 14.3, 14.5, 14.2, 14.4, 200800),
('2013-05-27 00:00:00', 14.5, 14.9, 14.5, 14.6, 708000),
('2013-05-28 00:00:00', 13.2, 14.9, 13.2, 14.7, 399200),
('2013-05-29 00:00:00', 14.8, 15.4, 14.7, 15, 1812900),
('2013-05-30 00:00:00', 14.9, 15.6, 14.9, 15.6, 901200),
('2013-05-31 00:00:00', 15.8, 15.9, 15.5, 15.6, 667000),
('2013-06-03 00:00:00', 15.6, 15.7, 15.3, 15.5, 517500),
('2013-06-04 00:00:00', 16, 16, 14.9, 15.1, 552500),
('2013-06-05 00:00:00', 15.1, 15.5, 15, 15.5, 381500),
('2013-06-06 00:00:00', 14.8, 15.5, 14.8, 15.3, 345100),
('2013-06-07 00:00:00', 15.3, 15.5, 15.2, 15.5, 543700),
('2013-06-10 00:00:00', 15.5, 15.6, 15.3, 15.4, 473000),
('2013-06-11 00:00:00', 15.2, 15.5, 15.1, 15.4, 216600),
('2013-06-12 00:00:00', 15.3, 15.5, 15.3, 15.4, 410200),
('2013-06-13 00:00:00', 14.8, 14.8, 14.2, 14.5, 413100),
('2013-06-14 00:00:00', 14.7, 14.7, 14.4, 14.4, 312300),
('2013-06-17 00:00:00', 14.3, 14.3, 13.8, 13.9, 420700),
('2013-06-18 00:00:00', 13.9, 13.9, 13.7, 13.9, 169700),
('2013-06-19 00:00:00', 14, 14, 13.7, 13.8, 175800),
('2013-06-20 00:00:00', 13.8, 13.8, 13.6, 13.7, 107800),
('2013-06-21 00:00:00', 13.6, 13.8, 13.5, 13.7, 11900),
('2013-06-24 00:00:00', 13.7, 13.7, 13.5, 13.6, 121600),
('2013-06-25 00:00:00', 13.5, 13.5, 12.9, 13.3, 396000),
('2013-06-26 00:00:00', 13.2, 13.3, 13, 13.3, 91500),
('2013-06-27 00:00:00', 13.2, 13.5, 13.2, 13.4, 126500),
('2013-06-28 00:00:00', 12.1, 13.6, 12.1, 13.3, 154100),
('2013-07-01 00:00:00', 13.1, 13.3, 13.1, 13.3, 31600),
('2013-07-02 00:00:00', 12, 13.6, 12, 13.5, 86000),
('2013-07-03 00:00:00', 13.4, 13.5, 13.4, 13.4, 57200),
('2013-07-04 00:00:00', 13.4, 13.4, 13.3, 13.3, 79800),
('2013-07-05 00:00:00', 13.4, 13.4, 13, 13, 259700),
('2013-07-08 00:00:00', 13.5, 13.6, 13, 13.2, 97700),
('2013-07-09 00:00:00', 13.1, 13.4, 13.1, 13.2, 59800),
('2013-07-10 00:00:00', 13.3, 13.4, 13.2, 13.3, 60500),
('2013-07-11 00:00:00', 13.3, 13.3, 13.2, 13.2, 88300),
('2013-07-12 00:00:00', 13.4, 13.5, 13.2, 13.5, 128200),
('2013-07-15 00:00:00', 13.5, 13.7, 13.4, 13.6, 183600),
('2013-07-16 00:00:00', 13.7, 13.7, 13.5, 13.5, 84700),
('2013-07-17 00:00:00', 13.4, 13.6, 13.4, 13.6, 27400),
('2013-07-18 00:00:00', 13.5, 13.8, 13.5, 13.6, 218000),
('2013-07-19 00:00:00', 13.6, 13.9, 13.6, 13.7, 240700),
('2013-07-22 00:00:00', 13.9, 13.9, 13.6, 13.8, 83200),
('2013-07-23 00:00:00', 13.7, 13.8, 13.6, 13.8, 90800),
('2013-07-24 00:00:00', 13.6, 13.7, 13.3, 13.4, 153200),
('2013-07-25 00:00:00', 13.4, 13.4, 13.3, 13.4, 137000),
('2013-07-26 00:00:00', 13.4, 13.5, 13.2, 13.3, 90800),
('2013-07-29 00:00:00', 12.4, 13.5, 12.4, 13.1, 94000),
('2013-07-30 00:00:00', 13, 13.2, 13, 13.2, 73000),
('2013-08-02 00:00:00', 13.3, 13.4, 13.2, 13.4, 22100),
('2013-08-05 00:00:00', 13.4, 13.4, 13.2, 13.3, 94400),
('2013-08-06 00:00:00', 13.2, 13.4, 13.1, 13.3, 176600),
('2013-08-07 00:00:00', 13.4, 13.5, 13.3, 13.3, 130200),
('2013-08-08 00:00:00', 13.4, 13.5, 13.3, 13.3, 264100),
('2013-08-09 00:00:00', 13.4, 13.6, 13.4, 13.4, 211600),
('2013-08-12 00:00:00', 13.4, 13.5, 13.3, 13.4, 104300),
('2013-08-13 00:00:00', 13.3, 13.4, 13.2, 13.3, 193900),
('2013-08-14 00:00:00', 13.3, 13.3, 13.1, 13.3, 216100),
('2013-08-15 00:00:00', 13.3, 13.4, 13.1, 13.4, 162000),
('2013-08-16 00:00:00', 13.5, 13.5, 13.3, 13.4, 113900),
('2013-08-19 00:00:00', 13.4, 13.8, 13.4, 13.7, 314300),
('2013-08-20 00:00:00', 13.8, 13.8, 13.5, 13.6, 159800),
('2013-08-21 00:00:00', 13.5, 13.7, 13.4, 13.7, 272700),
('2013-08-22 00:00:00', 13.6, 13.7, 13.4, 13.5, 169100),
('2013-08-23 00:00:00', 13.7, 13.7, 13.4, 13.5, 173600),
('2013-08-26 00:00:00', 13.5, 13.6, 13.4, 13.6, 130300),
('2013-08-27 00:00:00', 13.5, 13.5, 13.4, 13.5, 85700),
('2013-08-28 00:00:00', 13.4, 13.4, 13.3, 13.3, 195700),
('2013-09-06 00:00:00', 13.1, 13.2, 12.1, 13.2, 56200),
('2013-09-09 00:00:00', 13.1, 13.1, 12.9, 12.9, 105400),
('2013-09-10 00:00:00', 13, 13.1, 12.9, 13, 145400),
('2013-09-11 00:00:00', 13.1, 13.1, 12.9, 13, 85000),
('2013-09-12 00:00:00', 13, 13.2, 13, 13.2, 87500),
('2013-09-13 00:00:00', 13.2, 13.3, 13, 13.1, 154800),
('2013-09-16 00:00:00', 13.1, 13.1, 12.9, 13, 64300),
('2013-09-17 00:00:00', 13, 13, 12.9, 12.9, 129100),
('2013-09-18 00:00:00', 13, 13.1, 12.9, 12.9, 270200),
('2013-09-19 00:00:00', 13, 13, 12.9, 13, 120100),
('2013-09-20 00:00:00', 13, 13, 12.9, 13, 89900),
('2013-09-23 00:00:00', 13, 13.1, 12.9, 13.1, 222800),
('2013-09-24 00:00:00', 13.1, 13.2, 12.9, 13.2, 200200),
('2013-09-25 00:00:00', 13.1, 13.6, 13.1, 13.4, 428700),
('2013-09-26 00:00:00', 13.4, 13.8, 13.3, 13.7, 695200),
('2013-09-27 00:00:00', 13.6, 13.7, 13.5, 13.5, 396700),
('2013-09-30 00:00:00', 13.6, 13.7, 13.6, 13.6, 239200),
('2013-10-01 00:00:00', 13.6, 14.3, 13.6, 14.2, 1124400),
('2013-10-02 00:00:00', 14.2, 14.8, 14.2, 14.6, 1044300),
('2013-10-03 00:00:00', 14.6, 14.7, 14.4, 14.7, 918800),
('2013-10-04 00:00:00', 14.6, 14.7, 14.5, 14.7, 407900),
('2013-10-07 00:00:00', 14.7, 15.7, 14.7, 15.5, 918800),
('2013-10-08 00:00:00', 15.4, 15.5, 15.1, 15.3, 621000),
('2013-10-09 00:00:00', 15.3, 15.4, 15.1, 15.2, 717600),
('2013-10-10 00:00:00', 15.1, 16.2, 15.1, 15.7, 1514300),
('2013-10-11 00:00:00', 15.8, 16, 15.5, 15.6, 399100),
('2013-10-14 00:00:00', 15.5, 15.5, 15.2, 15.2, 393500),
('2013-10-15 00:00:00', 15.2, 15.7, 15.2, 15.6, 470500),
('2013-10-16 00:00:00', 15.5, 16.1, 15.4, 15.7, 427500),
('2013-10-17 00:00:00', 15.7, 16.3, 15.7, 16.1, 976300),
('2013-10-18 00:00:00', 16.1, 16.6, 16, 16.5, 966800),
('2013-10-21 00:00:00', 16.6, 16.9, 16.3, 16.3, 710200),
('2013-10-22 00:00:00', 16.2, 16.3, 15.9, 16.1, 728500),
('2013-10-23 00:00:00', 16.2, 16.7, 16.2, 16.5, 762000),
('2013-10-24 00:00:00', 16.5, 18.1, 16, 16.5, 664600),
('2013-10-25 00:00:00', 16.5, 16.5, 16.1, 16.2, 361300),
('2013-10-28 00:00:00', 16.1, 16.3, 15.5, 15.5, 726600),
('2013-10-29 00:00:00', 15.4, 15.8, 15.4, 15.8, 341600),
('2013-10-30 00:00:00', 15.8, 15.9, 15.6, 15.6, 246000),
('2013-10-31 00:00:00', 15.6, 15.7, 15.5, 15.6, 201600),
('2013-11-01 00:00:00', 15.6, 15.7, 15.5, 15.5, 291100),
('2013-11-04 00:00:00', 15.4, 15.9, 15.4, 15.9, 282000),
('2013-11-05 00:00:00', 15.9, 16, 15.6, 15.8, 455400),
('2013-11-06 00:00:00', 15.8, 15.9, 15.7, 15.9, 323600),
('2013-11-07 00:00:00', 15.9, 16.3, 15.9, 16, 636100),
('2013-11-08 00:00:00', 16.2, 16.2, 15.9, 15.9, 197600),
('2013-11-11 00:00:00', 16, 16.4, 16, 16.4, 531000),
('2013-11-12 00:00:00', 16.5, 16.5, 16, 16, 363700),
('2013-11-13 00:00:00', 15.7, 16.1, 15.7, 15.9, 293700),
('2013-11-14 00:00:00', 16, 16, 15.8, 15.8, 286300),
('2013-11-15 00:00:00', 15.8, 16, 15.8, 15.9, 211500),
('2013-11-18 00:00:00', 16.1, 16.6, 16.1, 16.4, 938900),
('2013-11-19 00:00:00', 16.4, 16.9, 16.4, 16.9, 1056600),
('2013-11-20 00:00:00', 16.9, 17, 16.7, 17, 461500),
('2013-11-21 00:00:00', 15.3, 17.8, 15.3, 17, 1040200),
('2013-11-22 00:00:00', 16.9, 17.3, 16.7, 17.1, 375000),
('2013-11-25 00:00:00', 17.1, 17.3, 16.9, 16.9, 462000),
('2013-11-26 00:00:00', 16.8, 17, 16.7, 16.9, 354400),
('2013-11-27 00:00:00', 16.9, 17.2, 16.9, 16.9, 402600),
('2013-11-28 00:00:00', 16.9, 17, 16.8, 17, 152400),
('2013-11-29 00:00:00', 17, 17, 16.8, 16.9, 299100),
('2013-12-02 00:00:00', 16.9, 17, 16.8, 16.9, 218500),
('2013-12-03 00:00:00', 16.9, 17.7, 16.9, 17.5, 968300),
('2013-12-04 00:00:00', 17.5, 18.2, 17.5, 18.1, 865100),
('2013-12-05 00:00:00', 18.2, 18.2, 17.8, 18, 400600),
('2013-12-06 00:00:00', 18, 18.4, 17.9, 18.1, 268300),
('2013-12-09 00:00:00', 18.1, 18.2, 17.8, 17.8, 718300),
('2013-12-10 00:00:00', 17.8, 17.8, 17.6, 17.7, 321700),
('2013-12-11 00:00:00', 17.7, 17.7, 17.2, 17.2, 337000),
('2013-12-12 00:00:00', 16.8, 17.4, 16.8, 17.3, 427300),
('2013-12-13 00:00:00', 17.3, 17.5, 17.1, 17.4, 104900),
('2013-12-16 00:00:00', 17.4, 17.7, 17.4, 17.5, 142200),
('2013-12-17 00:00:00', 17.7, 17.8, 17.6, 17.8, 279500),
('2013-12-18 00:00:00', 18, 18, 17.7, 17.8, 181100),
('2013-12-19 00:00:00', 17.7, 18.4, 17.7, 18.2, 485600),
('2013-12-20 00:00:00', 18.2, 18.2, 18, 18, 194200),
('2013-12-23 00:00:00', 18, 18.2, 18, 18.1, 220200),
('2013-12-24 00:00:00', 18.2, 18.2, 18, 18.1, 183800),
('2013-12-25 00:00:00', 18.2, 18.2, 18, 18.1, 172200),
('2013-12-26 00:00:00', 18, 18, 17.7, 17.7, 240900),
('2013-12-27 00:00:00', 17.7, 17.9, 17.7, 17.7, 118200),
('2013-12-30 00:00:00', 17.7, 17.7, 17.1, 17.1, 301600),
('2013-12-31 00:00:00', 17.3, 17.7, 17.2, 17.7, 241600),
('2014-01-02 00:00:00', 17.7, 17.7, 17.5, 17.6, 126000),
('2014-01-03 00:00:00', 17.5, 17.6, 17.4, 17.5, 78500),
('2014-01-06 00:00:00', 17.6, 18.1, 17.6, 18, 242500),
('2014-01-07 00:00:00', 18.4, 18.4, 18, 18.2, 292000),
('2014-01-08 00:00:00', 18, 18.2, 17.9, 18.1, 267000),
('2014-01-09 00:00:00', 18, 18.9, 18, 18.8, 753400),
('2014-01-10 00:00:00', 18.8, 18.8, 18.5, 18.6, 426300),
('2014-01-13 00:00:00', 18.6, 18.9, 18.5, 18.6, 475000),
('2014-01-14 00:00:00', 18.6, 19.7, 18.6, 19.4, 1233900),
('2014-01-15 00:00:00', 19.5, 21, 19.5, 20.7, 981800),
('2014-01-16 00:00:00', 20.7, 21.2, 20.4, 20.9, 562600),
('2014-01-17 00:00:00', 21, 21, 20.6, 20.6, 772200),
('2014-01-20 00:00:00', 20.5, 21.5, 20.1, 20.1, 527700),
('2014-01-21 00:00:00', 20.3, 22.1, 20.2, 22.1, 757900),
('2014-01-22 00:00:00', 22.7, 23.5, 22, 22.5, 749400),
('2014-01-23 00:00:00', 22.4, 23.8, 22.4, 23.2, 359300),
('2014-01-24 00:00:00', 23.3, 23.4, 22.6, 22.9, 299100),
('2014-01-27 00:00:00', 22.9, 23.2, 22.5, 23.2, 432100),
('2014-02-06 00:00:00', 23.2, 23.4, 22.7, 23.4, 217300),
('2014-02-07 00:00:00', 23.4, 23.4, 22.8, 22.9, 524900),
('2014-02-10 00:00:00', 22.7, 24.2, 22.6, 24.1, 858000),
('2014-02-11 00:00:00', 24.6, 24.7, 23, 23, 551700),
('2014-02-12 00:00:00', 23, 23.7, 23, 23.7, 377000),
('2014-02-13 00:00:00', 23.8, 23.8, 23.1, 23.4, 679200),
('2014-02-14 00:00:00', 23.3, 23.6, 23, 23.4, 562600),
('2014-02-17 00:00:00', 23.4, 24.6, 22.8, 24.1, 1481300),
('2014-02-18 00:00:00', 24.2, 24.6, 23.8, 24.2, 548100),
('2014-02-19 00:00:00', 24.2, 25.1, 24.2, 24.6, 991300),
('2014-02-20 00:00:00', 24.5, 24.5, 22.3, 22.7, 1065800),
('2014-02-21 00:00:00', 22.7, 24.2, 22, 23.8, 1322500),
('2014-02-24 00:00:00', 23.9, 24.3, 23.6, 23.9, 461500),
('2014-02-25 00:00:00', 23.9, 24, 23.6, 23.9, 650200),
('2014-02-26 00:00:00', 23.9, 23.9, 23.1, 23.6, 529800),
('2014-02-27 00:00:00', 23.7, 24, 23.1, 23.1, 638400),
('2014-02-28 00:00:00', 23.3, 23.5, 22.8, 23.1, 606900),
('2014-03-03 00:00:00', 23.1, 23.1, 22, 22, 605100),
('2014-03-04 00:00:00', 22, 23.3, 21.1, 22.4, 480300),
('2014-03-05 00:00:00', 22.7, 22.9, 22.5, 22.7, 299000),
('2014-03-06 00:00:00', 22.9, 24.9, 22.9, 24.3, 1500400),
('2014-03-07 00:00:00', 24.7, 24.8, 24.1, 24.3, 541800),
('2014-03-10 00:00:00', 24.4, 24.5, 24.1, 24.4, 411100),
('2014-03-11 00:00:00', 24.5, 26.5, 24.5, 25.7, 1430000),
('2014-03-12 00:00:00', 25.7, 26.3, 25.1, 25.9, 713300),
('2014-03-13 00:00:00', 26.1, 26.1, 25.4, 25.5, 460900),
('2014-03-14 00:00:00', 25.5, 25.6, 24.6, 24.9, 1441600),
('2014-03-17 00:00:00', 24.9, 25.3, 24.8, 25, 641211),
('2014-03-18 00:00:00', 25.2, 25.4, 24.9, 25, 674000),
('2014-03-19 00:00:00', 25, 25.2, 24.8, 25, 596200),
('2014-03-20 00:00:00', 25, 25, 25, 25, 0),
('2014-03-21 00:00:00', 25, 25.3, 24.9, 25.1, 791000),
('2014-03-24 00:00:00', 25.1, 26.2, 25.1, 25.7, 881200),
('2014-03-25 00:00:00', 25.7, 25.7, 24.8, 24.8, 547000),
('2014-03-26 00:00:00', 24.8, 25, 23, 23.6, 1104400),
('2014-03-27 00:00:00', 23.6, 23.7, 22.9, 23.5, 465200),
('2014-03-28 00:00:00', 23.8, 24, 23.3, 23.4, 269600),
('2014-03-31 00:00:00', 24.4, 24.4, 23.5, 23.8, 256500),
('2014-04-01 00:00:00', 23.8, 23.8, 22.9, 23.2, 459700),
('2014-04-02 00:00:00', 23.2, 23.4, 22.4, 23, 390600),
('2014-04-03 00:00:00', 23, 23.3, 23, 23.2, 255400),
('2014-04-04 00:00:00', 23.2, 23.4, 22.5, 22.8, 494300),
('2014-04-07 00:00:00', 23.2, 23.3, 22.8, 23, 156300),
('2014-04-08 00:00:00', 23, 24.3, 23, 24, 490200),
('2014-04-10 00:00:00', 23, 24, 23, 23.4, 201100),
('2014-04-11 00:00:00', 23.5, 23.5, 22.9, 23, 383100),
('2014-04-14 00:00:00', 23, 23, 22.5, 22.6, 485200),
('2014-04-15 00:00:00', 22.6, 22.6, 21.5, 21.5, 490800),
('2014-04-16 00:00:00', 21.4, 21.5, 20.3, 20.8, 379100),
('2014-04-17 00:00:00', 21, 21.5, 20.8, 21.5, 204500),
('2014-04-18 00:00:00', 21.5, 21.5, 20.3, 20.4, 465700),
('2014-04-21 00:00:00', 20, 20.2, 19.5, 19.5, 250000),
('2014-04-22 00:00:00', 19.4, 20, 19, 20, 379500),
('2014-04-23 00:00:00', 20.2, 20.2, 19.4, 19.5, 102800),
('2014-04-24 00:00:00', 19.4, 19.6, 19.3, 19.4, 100700),
('2014-04-25 00:00:00', 19.4, 19.6, 19.3, 19.5, 174700);
INSERT INTO `stock_info_aaa` (`date`, `open`, `high`, `low`, `close`, `volume`) VALUES
('2014-04-28 00:00:00', 19.8, 19.8, 19.4, 19.4, 74300),
('2014-04-29 00:00:00', 19.3, 19.6, 19.1, 19.6, 108700),
('2014-05-05 00:00:00', 19.4, 19.4, 18.3, 18.3, 322400),
('2014-05-06 00:00:00', 18, 18.3, 17.5, 18.2, 433600),
('2014-05-07 00:00:00', 18.2, 18.3, 18, 18, 95600),
('2014-05-08 00:00:00', 18, 18, 16.2, 16.2, 811500),
('2014-05-09 00:00:00', 16.2, 16.9, 15, 16.8, 358100),
('2014-05-12 00:00:00', 16.2, 17.2, 15.3, 15.5, 511700),
('2014-05-13 00:00:00', 15.3, 15.9, 15.3, 15.7, 458700),
('2014-05-14 00:00:00', 16.2, 16.7, 15.8, 16.6, 267300),
('2014-05-15 00:00:00', 16.5, 16.8, 15.5, 16.2, 366700),
('2014-05-16 00:00:00', 16.3, 16.7, 15.8, 16.7, 306500),
('2014-05-19 00:00:00', 16.7, 17, 16.4, 16.8, 207400),
('2014-05-20 00:00:00', 16.7, 18, 16.5, 18, 391000),
('2014-05-21 00:00:00', 17.6, 18.6, 17.6, 18.5, 541300),
('2014-05-22 00:00:00', 18.6, 18.8, 17.8, 17.9, 639200),
('2014-05-23 00:00:00', 17.9, 18.1, 17.7, 17.8, 153000),
('2014-05-26 00:00:00', 17.6, 17.9, 17.5, 17.9, 197500),
('2014-05-27 00:00:00', 17.9, 18.5, 17.8, 18.3, 466900),
('2014-05-28 00:00:00', 18.7, 19.6, 18.6, 19.4, 775400),
('2014-05-29 00:00:00', 19, 19.4, 18.6, 18.9, 457500),
('2014-05-30 00:00:00', 18.7, 19, 18.5, 18.5, 315300),
('2014-06-02 00:00:00', 18.3, 18.5, 17.9, 18, 384300),
('2014-06-03 00:00:00', 18, 18.3, 17.9, 18.1, 169600),
('2014-06-04 00:00:00', 18.1, 18.1, 17.6, 17.9, 207700),
('2014-06-05 00:00:00', 17.9, 18.1, 17.8, 18.1, 81300),
('2014-06-06 00:00:00', 17.9, 18.4, 17.9, 18.4, 102000),
('2014-06-09 00:00:00', 18.3, 18.6, 18, 18.4, 120900),
('2014-06-10 00:00:00', 18.4, 18.8, 18.3, 18.5, 330800),
('2014-06-11 00:00:00', 18.5, 18.8, 18.4, 18.8, 327100),
('2014-06-12 00:00:00', 18.7, 18.9, 18.6, 18.6, 206100),
('2014-06-13 00:00:00', 18.7, 18.7, 18.5, 18.7, 185000),
('2014-06-16 00:00:00', 18.7, 18.7, 18.4, 18.6, 161100),
('2014-06-17 00:00:00', 18.6, 18.9, 18.6, 18.6, 244300),
('2014-06-18 00:00:00', 18.2, 18.2, 17.9, 17.9, 384700),
('2014-06-19 00:00:00', 18, 18, 17.4, 17.8, 191600),
('2014-06-20 00:00:00', 17.9, 17.9, 17.6, 17.7, 57500),
('2014-06-23 00:00:00', 17.8, 17.8, 17.6, 17.6, 173300),
('2014-06-24 00:00:00', 17.7, 17.8, 17.6, 17.8, 137500),
('2014-06-25 00:00:00', 17.8, 18.1, 17.8, 18.1, 182200),
('2014-06-26 00:00:00', 18.2, 18.2, 18.1, 18.2, 179900),
('2014-06-27 00:00:00', 18.1, 18.1, 17.9, 18, 149200),
('2014-06-30 00:00:00', 17.9, 18.1, 17.8, 18, 101900),
('2014-07-01 00:00:00', 18, 18.2, 17.8, 18.1, 249300),
('2014-07-02 00:00:00', 18.1, 18.8, 18, 18.7, 432200),
('2014-07-03 00:00:00', 19.1, 19.3, 18.8, 19.2, 818100),
('2014-07-04 00:00:00', 19.3, 19.3, 19, 19.2, 326100),
('2014-07-07 00:00:00', 19.2, 19.5, 19.1, 19.2, 374200),
('2014-07-08 00:00:00', 19.1, 20, 19, 19.8, 555900),
('2014-07-09 00:00:00', 20, 20.5, 19.8, 20.3, 273100),
('2014-07-10 00:00:00', 20.4, 20.4, 19, 19.7, 487100),
('2014-07-11 00:00:00', 19.7, 19.7, 19.1, 19.4, 393800),
('2014-07-14 00:00:00', 19.4, 19.6, 19.2, 19.6, 119600),
('2014-07-15 00:00:00', 19.7, 19.8, 19.5, 19.7, 251800),
('2014-07-16 00:00:00', 19.8, 20.2, 19.6, 19.6, 359100),
('2014-07-17 00:00:00', 19.6, 19.6, 19.4, 19.6, 266800),
('2014-07-18 00:00:00', 19.7, 19.7, 19.2, 19.6, 293500),
('2014-07-21 00:00:00', 19.6, 19.7, 19.1, 19.3, 225000),
('2014-07-22 00:00:00', 19.2, 19.3, 19.1, 19.3, 75900),
('2014-07-23 00:00:00', 19.3, 19.5, 19.2, 19.2, 67300),
('2014-07-24 00:00:00', 19.2, 19.6, 19, 19.5, 360000),
('2014-07-25 00:00:00', 19.5, 19.5, 19, 19, 252100),
('2014-07-28 00:00:00', 19, 19, 18.4, 18.5, 297300),
('2014-07-29 00:00:00', 18.5, 18.7, 18.3, 18.5, 80400),
('2014-07-30 00:00:00', 18.3, 18.5, 18.3, 18.3, 137600),
('2014-07-31 00:00:00', 18.4, 18.5, 18.2, 18.4, 155400),
('2014-08-01 00:00:00', 18.4, 18.4, 18.1, 18.3, 143100),
('2014-08-04 00:00:00', 18.3, 18.4, 18.2, 18.4, 46400),
('2014-08-05 00:00:00', 18.6, 18.8, 18.5, 18.7, 141000),
('2014-08-06 00:00:00', 18.7, 18.7, 18.6, 18.7, 107400),
('2014-08-07 00:00:00', 18.7, 18.8, 18.6, 18.7, 88800),
('2014-08-08 00:00:00', 18.7, 19.3, 18.7, 19.3, 384700),
('2014-08-11 00:00:00', 19.3, 19.3, 18.9, 19.2, 143100),
('2014-08-12 00:00:00', 19.1, 19.1, 18.9, 19, 42100),
('2014-08-13 00:00:00', 19, 20.9, 18.9, 20.9, 1742800),
('2014-08-14 00:00:00', 22.9, 22.9, 21.2, 21.5, 1038300),
('2014-08-15 00:00:00', 21.5, 21.6, 20.9, 21, 450200),
('2014-08-18 00:00:00', 21, 21.6, 20.9, 21.3, 1033900),
('2014-08-19 00:00:00', 21.3, 21.4, 20.5, 20.7, 903600),
('2014-08-20 00:00:00', 20.7, 20.9, 20.4, 20.6, 396776),
('2014-08-21 00:00:00', 20.6, 20.9, 20, 20.4, 928000),
('2014-08-22 00:00:00', 20.1, 20.3, 20, 20, 624456),
('2014-08-25 00:00:00', 20.2, 20.7, 20.2, 20.4, 728050),
('2014-08-26 00:00:00', 17.2, 17.2, 15.7, 17.1, 1468650),
('2014-08-27 00:00:00', 17.1, 17.1, 16.4, 16.5, 565100),
('2014-08-28 00:00:00', 16.6, 17, 16.6, 16.8, 487400),
('2014-08-29 00:00:00', 16.9, 16.9, 16.6, 16.8, 254600),
('2014-09-03 00:00:00', 16.8, 17, 16.7, 16.9, 745550),
('2014-09-04 00:00:00', 17, 17, 16.5, 16.6, 429106),
('2014-09-05 00:00:00', 16.7, 16.7, 16.6, 16.7, 365100),
('2014-09-08 00:00:00', 16.8, 17.6, 16.7, 17.4, 1728570),
('2014-09-09 00:00:00', 17.4, 17.5, 16.4, 16.7, 784540),
('2014-09-10 00:00:00', 16.8, 16.9, 16.5, 16.8, 368400),
('2014-09-11 00:00:00', 16.8, 17, 16.6, 16.7, 794500),
('2014-09-12 00:00:00', 16.7, 16.8, 16.6, 16.8, 555300),
('2014-09-15 00:00:00', 16.8, 17.1, 16.7, 16.7, 554700),
('2014-09-16 00:00:00', 16.5, 16.7, 16.3, 16.7, 416800),
('2014-09-17 00:00:00', 16.9, 16.9, 16.5, 16.5, 629300),
('2014-09-18 00:00:00', 16.5, 17.1, 16.4, 16.7, 1303200),
('2014-09-19 00:00:00', 16.8, 16.8, 16.6, 16.6, 162900),
('2014-09-22 00:00:00', 16.6, 16.7, 16.3, 16.3, 327200),
('2014-09-23 00:00:00', 16.3, 16.3, 16, 16.1, 442900),
('2014-09-24 00:00:00', 16.1, 16.2, 15.9, 16.2, 361300),
('2014-09-25 00:00:00', 16, 16.2, 15.8, 16.2, 251200),
('2014-09-26 00:00:00', 16.2, 16.2, 16, 16, 184700),
('2014-09-29 00:00:00', 16, 16, 15.5, 15.8, 306100),
('2014-09-30 00:00:00', 15.8, 15.9, 15.6, 15.7, 174440),
('2014-10-01 00:00:00', 16, 16.2, 15.7, 16.1, 291300),
('2014-10-02 00:00:00', 16.1, 16.7, 16.1, 16.5, 438800),
('2014-10-03 00:00:00', 16.4, 16.9, 16.4, 16.7, 480600),
('2014-10-06 00:00:00', 16.7, 16.9, 16.6, 16.7, 210700),
('2014-10-07 00:00:00', 16.6, 16.7, 16.3, 16.3, 695400),
('2014-10-08 00:00:00', 16.3, 16.7, 16.2, 16.4, 351200),
('2014-10-09 00:00:00', 16.5, 16.5, 16.3, 16.4, 198800),
('2014-10-10 00:00:00', 16.2, 16.4, 16.1, 16.1, 246210),
('2014-10-13 00:00:00', 16.1, 16.3, 16, 16.3, 176300),
('2014-10-14 00:00:00', 16.3, 16.4, 15.9, 15.9, 199000),
('2014-10-15 00:00:00', 16, 16, 15.7, 15.9, 166100),
('2014-10-16 00:00:00', 15.8, 15.8, 15, 15.3, 347100),
('2014-10-17 00:00:00', 15.5, 15.6, 15.1, 15.6, 149500),
('2014-10-20 00:00:00', 15.9, 15.9, 15.5, 15.5, 66600),
('2014-10-21 00:00:00', 15.5, 15.6, 15.3, 15.6, 83200),
('2014-10-22 00:00:00', 15.6, 15.7, 15.5, 15.7, 86200),
('2014-10-23 00:00:00', 15.7, 15.7, 15.4, 15.5, 124100),
('2014-10-24 00:00:00', 15.7, 15.7, 15.3, 15.5, 74600),
('2014-10-27 00:00:00', 15.6, 15.6, 14.9, 15.2, 85400),
('2014-10-28 00:00:00', 15.2, 15.2, 15, 15.1, 111300),
('2014-10-29 00:00:00', 15.2, 15.5, 15.1, 15.5, 109200),
('2014-10-30 00:00:00', 15.5, 15.5, 15.3, 15.4, 114400),
('2014-10-31 00:00:00', 15.5, 15.6, 15.3, 15.6, 182500),
('2014-11-03 00:00:00', 15.7, 15.9, 15.6, 15.8, 188100),
('2014-11-04 00:00:00', 15.8, 15.8, 15.6, 15.6, 50600),
('2014-11-05 00:00:00', 15.6, 15.6, 15.3, 15.6, 113000),
('2014-11-06 00:00:00', 15.7, 16.5, 15.7, 16.2, 685600),
('2014-11-07 00:00:00', 16.2, 16.2, 15.9, 16.2, 120000),
('2014-11-10 00:00:00', 16.3, 16.7, 16.2, 16.2, 299700),
('2014-11-11 00:00:00', 16.2, 16.3, 15.8, 15.8, 416500),
('2014-11-12 00:00:00', 16, 16.1, 15.9, 16.1, 180000),
('2014-11-13 00:00:00', 16.1, 16.2, 15.9, 16.1, 138300),
('2014-11-14 00:00:00', 15.9, 16, 15.7, 15.8, 177400),
('2014-11-17 00:00:00', 15.9, 16, 15.6, 15.8, 224400),
('2014-11-18 00:00:00', 15.8, 16.4, 15.5, 16, 1810900),
('2014-11-19 00:00:00', 16, 16, 15.6, 15.9, 304600),
('2014-11-20 00:00:00', 16, 16.1, 15.7, 16, 450500),
('2014-11-21 00:00:00', 15.9, 17.1, 15.9, 16.3, 3252370),
('2014-11-24 00:00:00', 16.5, 16.7, 16.2, 16.5, 786700),
('2014-11-25 00:00:00', 16.5, 16.6, 16.2, 16.5, 314920),
('2014-11-26 00:00:00', 16.4, 17.1, 16.2, 16.2, 2236000),
('2014-11-27 00:00:00', 16.2, 16.7, 16, 16.7, 745800),
('2014-11-28 00:00:00', 16.8, 18, 16.8, 17.7, 3639056),
('2014-12-01 00:00:00', 17.7, 18.4, 17.4, 17.7, 1892600),
('2014-12-02 00:00:00', 17.7, 18.2, 17.5, 17.9, 1272200),
('2014-12-03 00:00:00', 17.9, 18.1, 17.7, 17.8, 1423603),
('2014-12-04 00:00:00', 17.8, 18.1, 17.4, 17.5, 1351231),
('2014-12-05 00:00:00', 17.4, 17.8, 17, 17.4, 1477110),
('2014-12-08 00:00:00', 17.4, 17.9, 17.4, 17.6, 1213726),
('2014-12-09 00:00:00', 17.3, 17.6, 16.3, 16.3, 1573700),
('2014-12-10 00:00:00', 16.5, 17.2, 16.2, 17, 1151400),
('2014-12-11 00:00:00', 16.8, 17.1, 16.6, 16.6, 800500),
('2014-12-12 00:00:00', 16.6, 16.8, 16.5, 16.7, 445000),
('2014-12-15 00:00:00', 16.7, 16.9, 16.6, 16.7, 685510),
('2014-12-16 00:00:00', 16.6, 16.6, 16.1, 16.1, 881100),
('2014-12-17 00:00:00', 16.2, 16.3, 14.7, 15.6, 2201800),
('2014-12-18 00:00:00', 15.7, 16.1, 14.1, 14.1, 3578400),
('2014-12-19 00:00:00', 14.1, 14.4, 12.9, 13.2, 1698250),
('2014-12-22 00:00:00', 13.2, 14.3, 13.2, 14.3, 747010),
('2014-12-23 00:00:00', 14.3, 14.3, 13.7, 13.7, 951100),
('2014-12-24 00:00:00', 13.7, 13.9, 13.6, 13.8, 423026),
('2014-12-25 00:00:00', 13.7, 13.9, 13.5, 13.6, 468500),
('2014-12-26 00:00:00', 13.5, 13.7, 13.2, 13.5, 312600),
('2014-12-29 00:00:00', 13.5, 13.7, 13, 13.1, 381600),
('2014-12-30 00:00:00', 13.2, 13.4, 12.7, 13.4, 400700),
('2014-12-31 00:00:00', 13.5, 14.1, 13.5, 13.9, 809710),
('2015-01-05 00:00:00', 13.9, 14, 13.7, 13.8, 284100),
('2015-01-06 00:00:00', 13.7, 14, 13.4, 14, 453200),
('2015-01-07 00:00:00', 14, 14.9, 13.9, 14.5, 1209900),
('2015-01-08 00:00:00', 14.5, 14.5, 14.1, 14.2, 338400),
('2015-01-09 00:00:00', 14.2, 14.3, 13.9, 13.9, 753100),
('2015-01-12 00:00:00', 13.9, 13.9, 13.5, 13.5, 1269500),
('2015-01-13 00:00:00', 13.5, 13.9, 13.5, 13.8, 454800),
('2015-01-14 00:00:00', 13.8, 13.9, 13.5, 13.8, 260900),
('2015-01-15 00:00:00', 12.5, 13.9, 12.5, 13.7, 692500),
('2015-01-16 00:00:00', 13.7, 13.9, 13.5, 13.7, 510500),
('2015-01-19 00:00:00', 13.8, 13.8, 13.5, 13.6, 170700),
('2015-01-20 00:00:00', 13.6, 13.7, 13.4, 13.4, 524300),
('2015-01-21 00:00:00', 13.5, 13.6, 13.4, 13.4, 209601),
('2015-01-22 00:00:00', 13.5, 13.5, 13.3, 13.5, 291000),
('2015-01-23 00:00:00', 13.5, 13.6, 13.4, 13.5, 503000),
('2015-01-26 00:00:00', 13.6, 13.7, 13.5, 13.6, 357500),
('2015-01-27 00:00:00', 13.6, 13.6, 13.2, 13.3, 849750),
('2015-01-28 00:00:00', 13.3, 13.4, 13.1, 13.2, 310840),
('2015-01-29 00:00:00', 13.3, 13.4, 13.1, 13.3, 299100),
('2015-01-30 00:00:00', 13.3, 13.4, 13, 13, 426300),
('2015-02-02 00:00:00', 13.1, 13.2, 13, 13, 258600),
('2015-02-03 00:00:00', 13, 13, 12.5, 12.9, 1530400),
('2015-02-04 00:00:00', 12.4, 13.1, 12.4, 13, 903809),
('2015-02-05 00:00:00', 13, 13.1, 12.9, 12.9, 248000),
('2015-02-06 00:00:00', 12.9, 13.1, 12.8, 13, 457500),
('2015-02-09 00:00:00', 13, 13, 12.8, 13, 365200),
('2015-02-10 00:00:00', 13, 13.1, 12.9, 13, 350010),
('2015-02-11 00:00:00', 13, 13.1, 12.9, 12.9, 240300),
('2015-02-12 00:00:00', 13, 13.1, 13, 13, 102200),
('2015-02-13 00:00:00', 13, 13.1, 12.9, 13, 223216),
('2015-02-24 00:00:00', 13.1, 13.2, 13, 13.1, 101300),
('2015-02-25 00:00:00', 13.1, 13.2, 13, 13.1, 142100),
('2015-02-26 00:00:00', 13, 13.1, 13, 13, 317400),
('2015-02-27 00:00:00', 13.1, 13.7, 13, 13.6, 759296),
('2015-03-02 00:00:00', 13.6, 13.7, 13.3, 13.3, 233504),
('2015-03-03 00:00:00', 13.4, 13.6, 13.3, 13.5, 284300),
('2015-03-04 00:00:00', 13.6, 13.6, 13.4, 13.5, 301600),
('2015-03-05 00:00:00', 13.6, 13.9, 13.5, 13.7, 731400),
('2015-03-06 00:00:00', 13.7, 13.8, 13.6, 13.6, 288800),
('2015-03-09 00:00:00', 13.5, 13.6, 13.4, 13.4, 217800),
('2015-03-10 00:00:00', 13.4, 13.6, 13.3, 13.4, 161201),
('2015-03-11 00:00:00', 13.4, 13.4, 13.3, 13.3, 163310),
('2015-03-12 00:00:00', 13.4, 13.6, 13.3, 13.3, 184200),
('2015-03-13 00:00:00', 13.4, 13.4, 13.2, 13.2, 134600),
('2015-03-16 00:00:00', 13.2, 13.3, 13, 13, 332200),
('2015-03-17 00:00:00', 13, 13.2, 13, 13.1, 361601),
('2015-03-18 00:00:00', 13.1, 13.1, 12.8, 12.9, 251700),
('2015-03-19 00:00:00', 13, 13.1, 12.9, 13.1, 344500),
('2015-03-20 00:00:00', 13, 13.1, 13, 13.1, 117756),
('2015-03-23 00:00:00', 13.1, 13.1, 12.9, 13, 407139),
('2015-03-24 00:00:00', 13, 13.1, 13, 13.1, 484800),
('2015-03-25 00:00:00', 13.1, 13.2, 12.9, 13, 146300),
('2015-03-26 00:00:00', 13.1, 13.1, 12.9, 13, 452300),
('2015-03-27 00:00:00', 13, 13, 12.7, 12.8, 253500),
('2015-03-30 00:00:00', 12.7, 12.8, 12.4, 12.4, 304850),
('2015-03-31 00:00:00', 12.4, 12.7, 12.3, 12.6, 66800),
('2015-04-01 00:00:00', 12.6, 12.6, 12.3, 12.3, 270700),
('2015-04-02 00:00:00', 12.3, 12.5, 12, 12.5, 160200),
('2015-04-03 00:00:00', 12.5, 12.6, 12.4, 12.4, 40000),
('2015-04-06 00:00:00', 12.4, 12.6, 12.4, 12.4, 95700),
('2015-04-07 00:00:00', 12.4, 12.6, 12.4, 12.5, 114910),
('2015-04-08 00:00:00', 12.6, 12.7, 12.5, 12.7, 84100),
('2015-04-09 00:00:00', 12.7, 13, 12.7, 13, 147400),
('2015-04-10 00:00:00', 12.9, 13.1, 12.8, 12.8, 113800),
('2015-04-13 00:00:00', 12.7, 12.8, 12.5, 12.5, 259800),
('2015-04-14 00:00:00', 12.5, 12.6, 12.3, 12.5, 1053000),
('2015-04-15 00:00:00', 12.5, 12.6, 12.3, 12.6, 631401),
('2015-04-16 00:00:00', 12.3, 12.7, 12.3, 12.4, 624200),
('2015-04-17 00:00:00', 12.4, 13.2, 12.3, 13, 1349916),
('2015-04-20 00:00:00', 13, 13, 12.7, 13, 301200),
('2015-04-21 00:00:00', 12.9, 13, 12.8, 13, 459407),
('2015-04-22 00:00:00', 12.8, 13, 12.8, 13, 296300),
('2015-04-23 00:00:00', 12.9, 13.2, 12.9, 12.9, 272010),
('2015-04-24 00:00:00', 12.8, 13, 12.8, 13, 87700),
('2015-04-27 00:00:00', 13, 13, 12.9, 13, 168900),
('2015-05-04 00:00:00', 13, 13, 12.6, 13, 659745),
('2015-05-05 00:00:00', 12.8, 12.9, 12.6, 12.9, 103909),
('2015-05-06 00:00:00', 12.8, 13, 12.7, 12.7, 400100),
('2015-05-07 00:00:00', 12.7, 13, 12.7, 13, 147500),
('2015-05-08 00:00:00', 13, 13, 12.9, 13, 86201),
('2015-05-11 00:00:00', 12.9, 13.2, 12.9, 13, 71522),
('2015-05-12 00:00:00', 12.9, 13.3, 12.9, 13.1, 303901),
('2015-05-13 00:00:00', 13.1, 13.5, 13, 13.5, 275200),
('2015-05-14 00:00:00', 13.5, 13.8, 13.4, 13.7, 518944),
('2015-05-15 00:00:00', 13.6, 14, 13.4, 13.6, 628700),
('2015-05-18 00:00:00', 13.3, 13.4, 13, 13, 172600),
('2015-05-19 00:00:00', 13, 13.1, 12.7, 12.7, 137310),
('2015-05-20 00:00:00', 12.8, 13.2, 12.8, 13, 193226),
('2015-05-21 00:00:00', 12.9, 13.2, 12.9, 12.9, 71300),
('2015-05-22 00:00:00', 12.8, 13, 12.8, 13, 69918),
('2015-05-25 00:00:00', 13.3, 13.3, 12.9, 13.3, 192933),
('2015-05-26 00:00:00', 13.4, 13.4, 13.2, 13.2, 200003),
('2015-05-27 00:00:00', 13.1, 13.2, 13, 13.1, 61710),
('2015-05-28 00:00:00', 13.1, 13.3, 13, 13.3, 283700),
('2015-05-29 00:00:00', 13.1, 13.4, 13.1, 13.3, 112600),
('2015-06-01 00:00:00', 13.1, 13.4, 13.1, 13.2, 88300),
('2015-06-02 00:00:00', 13.2, 13.2, 13, 13, 330900),
('2015-06-03 00:00:00', 13, 13.1, 12.8, 13.1, 301200),
('2015-06-04 00:00:00', 13, 13.1, 12.9, 13, 123500),
('2015-06-05 00:00:00', 13.1, 13.2, 13, 13.2, 128700),
('2015-06-08 00:00:00', 13.2, 14.5, 13.2, 14.2, 1135400),
('2015-06-09 00:00:00', 14.3, 14.3, 13.6, 13.7, 373100),
('2015-06-10 00:00:00', 13.7, 13.8, 13.5, 13.7, 95600),
('2015-06-11 00:00:00', 13.7, 13.8, 13.5, 13.7, 237203),
('2015-06-12 00:00:00', 13.8, 13.8, 13.3, 13.4, 223700),
('2015-06-15 00:00:00', 13.5, 13.6, 13.2, 13.2, 127200),
('2015-06-16 00:00:00', 13.3, 13.4, 13, 13, 250840),
('2015-06-17 00:00:00', 13, 13.7, 12.9, 13.3, 422300),
('2015-06-18 00:00:00', 13.2, 13.6, 13.2, 13.6, 96300),
('2015-06-19 00:00:00', 13.5, 13.6, 13.2, 13.3, 155600),
('2015-06-22 00:00:00', 13.1, 13.2, 13, 13.2, 288100),
('2015-06-23 00:00:00', 13.1, 13.2, 13.1, 13.1, 45120),
('2015-06-24 00:00:00', 13.2, 13.3, 13.1, 13.2, 66320),
('2015-06-25 00:00:00', 13.2, 13.3, 13, 13, 88900),
('2015-06-26 00:00:00', 13, 13.2, 13, 13, 66200),
('2015-06-29 00:00:00', 13, 13.1, 12.9, 13, 202900),
('2015-06-30 00:00:00', 12.9, 13.1, 12.9, 13, 299700),
('2015-07-01 00:00:00', 13, 13.1, 12.9, 13, 153900),
('2015-07-02 00:00:00', 12.9, 13.2, 12.9, 13.1, 100500),
('2015-07-03 00:00:00', 13.2, 13.5, 13, 13.4, 166200),
('2015-07-06 00:00:00', 13.4, 13.5, 13.3, 13.3, 368100),
('2015-07-07 00:00:00', 13.3, 13.6, 13.3, 13.5, 342820),
('2015-07-08 00:00:00', 13.5, 13.5, 13.2, 13.4, 488900),
('2015-07-09 00:00:00', 13.4, 13.5, 13.1, 13.3, 334000),
('2015-07-10 00:00:00', 13.3, 13.8, 13.3, 13.5, 356900),
('2015-07-13 00:00:00', 13.3, 13.8, 13.3, 13.8, 219500),
('2015-07-14 00:00:00', 13.6, 13.8, 13.4, 13.8, 243950),
('2015-07-15 00:00:00', 13.8, 13.8, 13.3, 13.8, 188600),
('2015-07-16 00:00:00', 13.8, 13.9, 13.5, 13.7, 345400),
('2015-07-17 00:00:00', 13.9, 14, 13.5, 13.6, 28300),
('2015-07-20 00:00:00', 13.6, 13.6, 13.2, 13.3, 90600),
('2015-07-21 00:00:00', 13.3, 13.8, 13.3, 13.5, 302500),
('2015-07-22 00:00:00', 13.4, 13.7, 13.4, 13.7, 74000),
('2015-07-23 00:00:00', 13.7, 13.8, 13.6, 13.7, 26600),
('2015-07-24 00:00:00', 13.5, 13.6, 13.4, 13.4, 41900),
('2015-07-27 00:00:00', 13.4, 13.8, 13.4, 13.7, 170200),
('2015-07-28 00:00:00', 13.6, 13.7, 13.6, 13.6, 93000),
('2015-07-29 00:00:00', 13.6, 13.6, 13.5, 13.5, 38402),
('2015-07-30 00:00:00', 13.5, 13.5, 13.3, 13.5, 127810),
('2015-07-31 00:00:00', 13.5, 13.7, 13.3, 13.5, 68313),
('2015-08-03 00:00:00', 13.4, 13.5, 13.3, 13.5, 119801),
('2015-08-04 00:00:00', 13.4, 13.5, 13.3, 13.5, 79800),
('2015-08-05 00:00:00', 13.4, 13.5, 13.4, 13.5, 41900),
('2015-08-06 00:00:00', 13.5, 13.6, 13.5, 13.5, 35600),
('2015-08-07 00:00:00', 13.4, 13.5, 13.4, 13.4, 24000),
('2015-08-10 00:00:00', 13.3, 13.4, 13.3, 13.3, 120000),
('2015-08-11 00:00:00', 13.2, 13.2, 13.1, 13.2, 122100),
('2015-08-12 00:00:00', 13, 13.3, 13, 13.2, 109300),
('2015-08-13 00:00:00', 13.2, 13.2, 12.8, 12.9, 84900),
('2015-08-14 00:00:00', 12.9, 12.9, 12.8, 12.9, 53400),
('2015-08-17 00:00:00', 12.9, 12.9, 12.7, 12.9, 115200),
('2015-08-18 00:00:00', 12.9, 12.9, 12.8, 12.8, 46400),
('2015-08-19 00:00:00', 13, 14, 13, 13.6, 360960),
('2015-08-20 00:00:00', 13.7, 13.7, 13.4, 13.4, 92900),
('2015-08-21 00:00:00', 13.5, 13.5, 13, 13.2, 439500),
('2015-08-24 00:00:00', 12.9, 12.9, 12, 12, 204210),
('2015-08-25 00:00:00', 11.5, 12.3, 11.5, 12.3, 253700),
('2015-08-26 00:00:00', 12.2, 12.7, 12.2, 12.7, 384300),
('2015-08-27 00:00:00', 12.5, 12.5, 12.4, 12.4, 385751),
('2015-08-28 00:00:00', 12.4, 12.6, 12.3, 12.5, 370900),
('2015-08-31 00:00:00', 12.5, 12.5, 12.2, 12.4, 416900),
('2015-09-01 00:00:00', 12.3, 12.4, 12, 12, 385700),
('2015-09-03 00:00:00', 11.9, 12.2, 11.9, 12.1, 86100),
('2015-09-04 00:00:00', 12.1, 12.3, 12.1, 12.3, 93000),
('2015-09-07 00:00:00', 12.2, 12.3, 12.2, 12.3, 307300),
('2015-09-08 00:00:00', 12.3, 12.3, 12.2, 12.2, 157800),
('2015-09-09 00:00:00', 12.2, 12.3, 12.1, 12.2, 104000),
('2015-09-10 00:00:00', 11, 12.2, 11, 12, 69500),
('2015-09-11 00:00:00', 12.1, 12.4, 12.1, 12.3, 550200),
('2015-09-14 00:00:00', 12.2, 12.4, 12.2, 12.3, 368700),
('2015-09-15 00:00:00', 12.2, 12.3, 12.1, 12.1, 87000),
('2015-09-16 00:00:00', 12.1, 12.6, 12.1, 12.3, 358800),
('2015-09-17 00:00:00', 12.3, 12.4, 12.2, 12.3, 328700),
('2015-09-18 00:00:00', 12.5, 12.6, 12.2, 12.4, 64500),
('2015-09-21 00:00:00', 12.6, 12.6, 12.3, 12.3, 72900),
('2015-09-22 00:00:00', 12.4, 12.4, 12.2, 12.4, 47800),
('2015-09-23 00:00:00', 12.4, 12.6, 12.3, 12.3, 146410),
('2015-09-24 00:00:00', 12.3, 12.8, 12.3, 12.8, 285000),
('2015-09-25 00:00:00', 13, 13.6, 13, 13.3, 462000),
('2015-09-28 00:00:00', 10.7, 11, 10.6, 10.6, 90906),
('2015-09-29 00:00:00', 10.6, 10.6, 10.3, 10.3, 146600),
('2015-09-30 00:00:00', 10.4, 10.4, 10.3, 10.3, 74519),
('2015-10-01 00:00:00', 10.3, 10.4, 10.2, 10.2, 86800),
('2015-10-02 00:00:00', 10.1, 10.7, 10.1, 10.5, 231800),
('2015-10-05 00:00:00', 10.5, 10.7, 10.5, 10.7, 248100),
('2015-10-06 00:00:00', 10.7, 10.9, 10.7, 10.8, 206750),
('2015-10-07 00:00:00', 10.9, 11, 10.8, 10.8, 315300),
('2015-10-08 00:00:00', 10.8, 10.8, 10.6, 10.6, 268102),
('2015-10-09 00:00:00', 10.8, 10.8, 10.6, 10.7, 238710),
('2015-10-12 00:00:00', 10.6, 10.7, 10.6, 10.7, 262500),
('2015-10-13 00:00:00', 10.6, 10.8, 10.6, 10.8, 344910),
('2015-10-14 00:00:00', 10.7, 10.8, 10.7, 10.8, 182200),
('2015-10-15 00:00:00', 10.6, 10.7, 10.6, 10.6, 80710),
('2015-10-16 00:00:00', 10.8, 10.8, 10.2, 10.2, 538710),
('2015-10-19 00:00:00', 10.3, 10.4, 10.2, 10.4, 143000),
('2015-10-20 00:00:00', 10.4, 10.4, 10.2, 10.3, 62600),
('2015-10-21 00:00:00', 10.3, 10.4, 10.2, 10.3, 103000),
('2015-10-22 00:00:00', 10.2, 10.4, 10.1, 10.4, 78480),
('2015-10-23 00:00:00', 10.3, 10.5, 10.3, 10.4, 134800),
('2015-10-26 00:00:00', 10.5, 10.5, 10.3, 10.4, 74300),
('2015-10-27 00:00:00', 10.4, 10.4, 10, 10.1, 97400),
('2015-10-28 00:00:00', 10, 10.2, 10, 10.2, 30000),
('2015-10-29 00:00:00', 10.2, 10.4, 10.1, 10.3, 121550),
('2015-10-30 00:00:00', 10.4, 11.3, 10.4, 11.3, 827530),
('2015-11-02 00:00:00', 11.9, 12.2, 11.5, 11.7, 839730),
('2015-11-03 00:00:00', 11.5, 11.6, 11.1, 11.3, 409460),
('2015-11-04 00:00:00', 11.3, 11.3, 11, 11, 342700),
('2015-11-05 00:00:00', 10.9, 11, 10.7, 10.9, 411176),
('2015-11-06 00:00:00', 10.9, 11.4, 10.7, 11.1, 514925),
('2015-11-09 00:00:00', 11.1, 11.4, 11.1, 11.3, 507060),
('2015-11-10 00:00:00', 11.3, 11.3, 11.1, 11.2, 333395),
('2015-11-11 00:00:00', 11.1, 11.1, 10.9, 10.9, 258180),
('2015-11-12 00:00:00', 10.7, 10.9, 10.1, 10.6, 229400),
('2015-11-13 00:00:00', 10.6, 10.8, 10.6, 10.7, 255525),
('2015-11-16 00:00:00', 10.6, 10.6, 10.3, 10.5, 226610),
('2015-11-17 00:00:00', 10.5, 10.8, 10.3, 10.5, 452487),
('2015-11-18 00:00:00', 10.7, 10.7, 10.5, 10.6, 215530),
('2015-11-19 00:00:00', 10.6, 11.2, 10.6, 11, 360600),
('2015-11-20 00:00:00', 10.8, 11.2, 10.8, 11.2, 617830),
('2015-11-23 00:00:00', 11.1, 11.5, 11.1, 11.4, 669950),
('2015-11-24 00:00:00', 11.3, 11.5, 11, 11.2, 293750),
('2015-11-25 00:00:00', 11.2, 11.4, 11, 11.3, 275850),
('2015-11-26 00:00:00', 11.2, 11.4, 11.2, 11.3, 210275),
('2015-11-27 00:00:00', 11.3, 11.3, 11.1, 11.1, 186530),
('2015-11-30 00:00:00', 11, 11, 10.8, 10.8, 83800),
('2015-12-01 00:00:00', 10.9, 11, 10.9, 11, 20800),
('2015-12-02 00:00:00', 11.3, 11.3, 10.9, 11, 70994),
('2015-12-03 00:00:00', 11, 11, 10.8, 10.8, 59110),
('2015-12-04 00:00:00', 10.8, 11.3, 10.8, 11.2, 221210),
('2015-12-07 00:00:00', 11.3, 11.6, 11.2, 11.2, 499059),
('2015-12-08 00:00:00', 11.2, 11.4, 11.2, 11.4, 152805),
('2015-12-09 00:00:00', 11.4, 11.5, 11.1, 11.3, 132000),
('2015-12-10 00:00:00', 11.2, 11.3, 11, 11, 141640),
('2015-12-11 00:00:00', 11, 11.2, 11, 11.1, 44200),
('2015-12-14 00:00:00', 11.3, 11.3, 11, 11.1, 61600),
('2015-12-15 00:00:00', 11.1, 11.2, 11.1, 11.2, 56080),
('2015-12-16 00:00:00', 11.2, 11.3, 11.1, 11.2, 86300),
('2015-12-17 00:00:00', 11.1, 11.3, 11.1, 11.3, 51400),
('2015-12-18 00:00:00', 11.1, 11.2, 11, 11.2, 65060),
('2015-12-21 00:00:00', 11, 11.2, 11, 11, 64050),
('2015-12-22 00:00:00', 11, 11.2, 10.9, 10.9, 84800),
('2015-12-23 00:00:00', 11, 11, 10.8, 10.9, 45800),
('2015-12-24 00:00:00', 10.9, 11, 10.8, 10.8, 112300),
('2015-12-25 00:00:00', 10.8, 11.3, 10.7, 10.9, 693700),
('2015-12-28 00:00:00', 11, 11.4, 10.9, 11.3, 461195),
('2015-12-29 00:00:00', 11.4, 11.8, 11.4, 11.5, 375255),
('2015-12-30 00:00:00', 11.5, 12.6, 11.2, 12.5, 1116958),
('2015-12-31 00:00:00', 12, 12.6, 12, 12.3, 217745),
('2016-01-04 00:00:00', 12.3, 12.7, 12.3, 12.6, 324250),
('2016-01-05 00:00:00', 12.4, 13.6, 12.4, 13.5, 1842018),
('2016-01-06 00:00:00', 13.5, 13.6, 13, 13.2, 249405),
('2016-01-07 00:00:00', 13.1, 13.5, 12.9, 13.2, 334090),
('2016-01-08 00:00:00', 13, 13.1, 12.7, 13.1, 168020),
('2016-01-11 00:00:00', 13, 13.9, 13, 13.8, 614427),
('2016-01-12 00:00:00', 13.9, 14.6, 13.6, 14.3, 916709),
('2016-01-13 00:00:00', 14.3, 14.5, 13.9, 13.9, 189045),
('2016-01-14 00:00:00', 13.7, 14.9, 13.7, 14.5, 802285),
('2016-01-15 00:00:00', 14.4, 15.2, 14.4, 14.9, 509115),
('2016-01-18 00:00:00', 14.9, 14.9, 14, 14.4, 626829),
('2016-01-19 00:00:00', 14.4, 14.9, 14.2, 14.5, 306011),
('2016-01-20 00:00:00', 14.5, 15.1, 14.3, 14.7, 821924),
('2016-01-21 00:00:00', 14.7, 15.8, 14.7, 15.7, 876915),
('2016-01-22 00:00:00', 15.7, 15.9, 15.3, 15.5, 397410),
('2016-01-25 00:00:00', 15.5, 15.7, 15.1, 15.5, 415210),
('2016-01-26 00:00:00', 15.4, 15.4, 14, 14, 667213),
('2016-01-27 00:00:00', 14, 15, 13.7, 14.1, 540042),
('2016-01-28 00:00:00', 14.1, 14.6, 14.1, 14.2, 180725),
('2016-01-29 00:00:00', 14.3, 14.3, 13.3, 13.6, 327977),
('2016-02-01 00:00:00', 13.6, 14.2, 13.6, 14.2, 929010),
('2016-02-02 00:00:00', 14.2, 14.8, 14.2, 14.4, 650180),
('2016-02-03 00:00:00', 14.5, 14.5, 14.2, 14.2, 498600),
('2016-02-04 00:00:00', 14.5, 14.5, 14.3, 14.3, 189590),
('2016-02-05 00:00:00', 14.2, 14.4, 14.2, 14.2, 131200),
('2016-02-15 00:00:00', 14.2, 14.8, 14.2, 14.8, 123428),
('2016-02-16 00:00:00', 14.8, 15.1, 14.8, 14.8, 510890),
('2016-02-17 00:00:00', 14.8, 15.3, 14.8, 15, 474760),
('2016-02-18 00:00:00', 15, 15.2, 15, 15.1, 240880),
('2016-02-19 00:00:00', 15.1, 15.1, 14.6, 15, 398570),
('2016-02-22 00:00:00', 14.9, 15, 14.7, 14.8, 173963),
('2016-02-23 00:00:00', 14.8, 14.9, 14.5, 14.5, 251510),
('2016-02-24 00:00:00', 14.5, 14.7, 14.4, 14.6, 306984),
('2016-02-25 00:00:00', 14.7, 15.1, 14.6, 14.7, 278800),
('2016-02-26 00:00:00', 14.7, 14.8, 14.5, 14.6, 147340),
('2016-02-29 00:00:00', 14.6, 14.7, 14.4, 14.4, 140280),
('2016-03-01 00:00:00', 14.4, 14.6, 14.4, 14.5, 149505),
('2016-03-02 00:00:00', 14.5, 15.3, 14.5, 15, 500150),
('2016-03-03 00:00:00', 15, 15.1, 14.9, 14.9, 172060),
('2016-03-04 00:00:00', 14.9, 15, 14.9, 14.9, 175700),
('2016-03-07 00:00:00', 15, 15.5, 14.8, 15, 500080),
('2016-03-08 00:00:00', 15, 15, 14.9, 14.9, 162930),
('2016-03-09 00:00:00', 14.9, 15, 14.8, 14.9, 157655),
('2016-03-10 00:00:00', 14.9, 16, 14.9, 16, 889020),
('2016-03-11 00:00:00', 16, 16.2, 15.8, 15.8, 610430),
('2016-03-14 00:00:00', 15.8, 16.3, 15.8, 16, 327093),
('2016-03-15 00:00:00', 16, 16.1, 15.7, 15.8, 434722),
('2016-03-16 00:00:00', 15.8, 16, 15.7, 15.8, 194050),
('2016-03-17 00:00:00', 15.9, 16.7, 15.9, 16.3, 1060520),
('2016-03-18 00:00:00', 16.3, 16.5, 16.3, 16.4, 341835),
('2016-03-21 00:00:00', 16.5, 17.4, 16.4, 16.5, 636410),
('2016-03-22 00:00:00', 16.5, 17.2, 16.4, 17.2, 790300),
('2016-03-23 00:00:00', 17.2, 17.4, 17.1, 17.4, 426170),
('2016-03-24 00:00:00', 17.1, 17.4, 16.8, 16.8, 564610),
('2016-03-25 00:00:00', 16.7, 17.1, 16.6, 16.9, 396256),
('2016-03-28 00:00:00', 16.8, 17.1, 16.7, 17, 337780),
('2016-03-29 00:00:00', 16.9, 17, 16.6, 17, 356588),
('2016-03-30 00:00:00', 16.8, 17.5, 16.7, 17.5, 713425),
('2016-03-31 00:00:00', 17.8, 17.8, 16.8, 16.8, 421105),
('2016-04-01 00:00:00', 16.7, 16.9, 16.6, 16.8, 254051),
('2016-04-04 00:00:00', 16.9, 17, 16.8, 16.8, 128959),
('2016-04-05 00:00:00', 16.9, 17.3, 16.8, 17.2, 216269),
('2016-04-06 00:00:00', 17.2, 17.4, 17.2, 17.3, 287705),
('2016-04-07 00:00:00', 17, 17, 16.7, 16.8, 160151),
('2016-04-08 00:00:00', 16.7, 16.9, 16.4, 16.4, 359523),
('2016-04-11 00:00:00', 16.4, 16.6, 16.4, 16.6, 194740),
('2016-04-12 00:00:00', 16.4, 16.6, 16.3, 16.5, 183859),
('2016-04-13 00:00:00', 16.6, 17.1, 16.5, 16.9, 644110),
('2016-04-14 00:00:00', 17, 17, 16.9, 16.9, 140510),
('2016-04-15 00:00:00', 17, 17, 16.8, 16.9, 177790),
('2016-04-19 00:00:00', 16.9, 17, 16.6, 16.8, 313320),
('2016-04-20 00:00:00', 16.8, 18.2, 16.8, 18.2, 1483644),
('2016-04-21 00:00:00', 18.3, 18.6, 18.1, 18.4, 976010),
('2016-04-22 00:00:00', 18.4, 18.4, 18.1, 18.4, 284155),
('2016-04-25 00:00:00', 18.3, 18.4, 18, 18.1, 265395),
('2016-04-26 00:00:00', 18, 18.5, 18, 18.3, 333062),
('2016-04-27 00:00:00', 18.4, 18.4, 18.1, 18.3, 165865),
('2016-04-28 00:00:00', 18.4, 19.1, 18.4, 18.7, 303378),
('2016-04-29 00:00:00', 18.7, 18.8, 18.5, 18.7, 200605),
('2016-05-04 00:00:00', 18.7, 19.4, 18.7, 19.2, 310663),
('2016-05-05 00:00:00', 19.6, 19.6, 18.9, 19.1, 257699),
('2016-05-06 00:00:00', 19.1, 19.3, 18.9, 19.1, 222525),
('2016-05-09 00:00:00', 19.2, 19.6, 19.1, 19.3, 181600),
('2016-05-10 00:00:00', 19.3, 20.1, 19.2, 20.1, 292952),
('2016-05-11 00:00:00', 20.4, 22.1, 20.2, 22, 558080),
('2016-05-12 00:00:00', 21.9, 22.7, 21.5, 21.9, 680730),
('2016-05-13 00:00:00', 21.8, 23.2, 21.7, 21.7, 536457),
('2016-05-16 00:00:00', 21.7, 23.5, 21.7, 23.4, 810235),
('2016-05-17 00:00:00', 23.4, 24.2, 23.2, 23.4, 557008),
('2016-05-18 00:00:00', 23.4, 23.6, 22.6, 22.6, 804250),
('2016-05-19 00:00:00', 22.4, 23, 22, 22.7, 236810),
('2016-05-20 00:00:00', 22.6, 23.1, 22.5, 22.5, 184850),
('2016-05-23 00:00:00', 22, 22.5, 22, 22.5, 197460),
('2016-05-24 00:00:00', 22.5, 24.2, 22.5, 24.1, 1122752),
('2016-05-25 00:00:00', 24.2, 24.5, 23.7, 24.1, 689205),
('2016-05-26 00:00:00', 24.1, 24.1, 23.8, 24.1, 216810),
('2016-05-27 00:00:00', 24.1, 25, 23.9, 24.8, 641784),
('2016-05-30 00:00:00', 24.9, 25, 24.7, 24.8, 334453),
('2016-05-31 00:00:00', 25, 25, 24.1, 24.2, 452487),
('2016-06-01 00:00:00', 24.1, 24.2, 23.8, 24.2, 412550),
('2016-06-02 00:00:00', 24.2, 24.9, 24.2, 24.9, 698785),
('2016-06-03 00:00:00', 25, 25, 24.6, 24.9, 398767),
('2016-06-06 00:00:00', 24.7, 25, 24.2, 24.7, 490339),
('2016-06-07 00:00:00', 24.7, 25.4, 24.7, 25.2, 365435),
('2016-06-08 00:00:00', 25.5, 25.5, 25, 25, 193435),
('2016-06-09 00:00:00', 25, 27.5, 24.9, 27.5, 1395396),
('2016-06-10 00:00:00', 27.6, 29.1, 27.5, 28.4, 1263968),
('2016-06-13 00:00:00', 28.5, 29, 27.3, 27.8, 802375),
('2016-06-14 00:00:00', 27.7, 28, 26.6, 27.7, 925661),
('2016-06-15 00:00:00', 27.5, 27.6, 26.8, 27.2, 862796),
('2016-06-16 00:00:00', 27.9, 28.5, 27.2, 28.3, 737855),
('2016-06-17 00:00:00', 28.5, 28.5, 27.2, 27.3, 1302190),
('2016-06-20 00:00:00', 27.3, 27.5, 26.6, 27.1, 805020),
('2016-06-21 00:00:00', 27.1, 27.8, 27, 27.8, 954790),
('2016-06-22 00:00:00', 28, 28, 27.6, 27.7, 261235),
('2016-06-23 00:00:00', 27.7, 27.9, 27.4, 27.5, 401110),
('2016-06-24 00:00:00', 27.5, 27.6, 24.8, 26.9, 1192340),
('2016-06-28 00:00:00', 27.9, 30, 27.9, 29.6, 894400),
('2016-06-29 00:00:00', 29.5, 29.7, 29.1, 29.5, 336300),
('2016-06-30 00:00:00', 29.5, 30.6, 29.5, 30, 469635),
('2016-07-01 00:00:00', 29.8, 30.5, 29.8, 30.3, 703995),
('2016-07-04 00:00:00', 30.3, 32, 30, 31.8, 591493),
('2016-07-05 00:00:00', 31.8, 32, 31.2, 31.5, 253958),
('2016-07-06 00:00:00', 31.2, 31.5, 30.6, 31, 268335),
('2016-07-07 00:00:00', 31, 32.7, 31, 31.6, 293865),
('2016-07-08 00:00:00', 31.6, 32, 30.5, 30.7, 351800),
('2016-07-11 00:00:00', 30.7, 30.7, 29.1, 29.1, 803925),
('2016-07-12 00:00:00', 29.2, 31.5, 28, 30.9, 809760),
('2016-07-13 00:00:00', 30.9, 31.5, 30.8, 31, 307317),
('2016-07-14 00:00:00', 31, 31.1, 30, 30, 631220),
('2016-07-15 00:00:00', 29.5, 30.1, 29.5, 30, 326160),
('2016-07-18 00:00:00', 30, 32.9, 30, 32.6, 1251206),
('2016-07-19 00:00:00', 32.7, 33.2, 31.4, 32.1, 369507),
('2016-07-20 00:00:00', 32, 32.7, 31.9, 32.2, 584195),
('2016-07-21 00:00:00', 32.2, 33.4, 31.9, 33.2, 451080),
('2016-07-22 00:00:00', 33.2, 33.4, 32.2, 33.3, 452017),
('2016-07-25 00:00:00', 33.3, 34.2, 33, 34.1, 594498),
('2016-07-26 00:00:00', 34, 34.2, 33.5, 34, 434315),
('2016-07-27 00:00:00', 34, 34.8, 33.3, 34.5, 486329),
('2016-07-28 00:00:00', 34.5, 35.5, 34.5, 35.5, 543735),
('2016-07-29 00:00:00', 37, 37, 35.5, 35.6, 422692),
('2016-08-01 00:00:00', 36.5, 36.5, 33.9, 34, 725093),
('2016-08-02 00:00:00', 34.1, 34.1, 32.3, 33, 707177),
('2016-08-03 00:00:00', 32.9, 34.2, 32.9, 33.1, 543052),
('2016-08-04 00:00:00', 33.1, 33.7, 32.7, 33.1, 412964),
('2016-08-05 00:00:00', 33, 33.3, 33, 33.1, 306275),
('2016-08-08 00:00:00', 33.4, 33.4, 33, 33.2, 167000),
('2016-08-09 00:00:00', 33.4, 34.1, 33.3, 34.1, 354308),
('2016-08-10 00:00:00', 34.3, 34.8, 34.2, 34.2, 363845),
('2016-08-11 00:00:00', 34.3, 34.4, 33.3, 33.6, 516073),
('2016-08-12 00:00:00', 33.3, 34, 33, 34, 558906),
('2016-08-15 00:00:00', 34, 34.2, 34, 34, 326875),
('2016-08-16 00:00:00', 34, 34.6, 34, 34.1, 376442),
('2016-08-17 00:00:00', 34.2, 34.4, 33.9, 34, 501486),
('2016-08-18 00:00:00', 34.3, 34.6, 33.7, 34.2, 287911),
('2016-08-19 00:00:00', 34.2, 34.3, 33.8, 33.8, 176827),
('2016-08-22 00:00:00', 33.5, 33.6, 33.1, 33.3, 139300),
('2016-08-23 00:00:00', 33.5, 33.9, 33.1, 33.8, 231640),
('2016-08-24 00:00:00', 33.8, 34, 33.7, 33.9, 271432),
('2016-08-25 00:00:00', 34, 34, 33.5, 33.6, 77940),
('2016-08-26 00:00:00', 33.4, 33.8, 33.1, 33.1, 279477),
('2016-08-29 00:00:00', 33.1, 33.2, 32.5, 33.1, 351255),
('2016-08-30 00:00:00', 32.9, 33.2, 32.8, 33.1, 53830),
('2016-08-31 00:00:00', 33, 33.2, 32.9, 32.9, 93636),
('2016-09-01 00:00:00', 32.7, 33, 32.5, 33, 100560),
('2016-09-05 00:00:00', 33, 33.1, 32.2, 33.1, 123611),
('2016-09-06 00:00:00', 33, 33, 32.6, 33, 153709),
('2016-09-07 00:00:00', 32.7, 33, 32.4, 33, 289105),
('2016-09-08 00:00:00', 32.6, 33, 32.5, 32.9, 116740),
('2016-09-09 00:00:00', 32.6, 32.9, 32.2, 32.9, 189360),
('2016-09-12 00:00:00', 32.6, 32.8, 32, 32, 153625),
('2016-09-13 00:00:00', 32, 32, 28.8, 29, 518713),
('2016-09-14 00:00:00', 29.1, 29.8, 27.1, 28.8, 1105780),
('2016-09-15 00:00:00', 28.8, 29.9, 28.8, 29.2, 354685),
('2016-09-16 00:00:00', 29.2, 29.3, 28.8, 28.9, 307787),
('2016-09-19 00:00:00', 28.9, 29.6, 28.8, 29.3, 623428),
('2016-09-20 00:00:00', 29.6, 29.6, 29.2, 29.6, 375400),
('2016-09-21 00:00:00', 29.6, 31.3, 29.6, 31, 490346),
('2016-09-22 00:00:00', 31.1, 32, 30.9, 31.1, 357700),
('2016-09-23 00:00:00', 31, 31.3, 30, 30.5, 198050),
('2016-09-26 00:00:00', 30.5, 30.8, 29.9, 29.9, 335410),
('2016-09-27 00:00:00', 29.9, 30.6, 29.9, 30.5, 596618),
('2016-09-28 00:00:00', 30.5, 31, 30.5, 30.9, 428960),
('2016-09-29 00:00:00', 30.9, 31.4, 30.5, 31.1, 593982),
('2016-09-30 00:00:00', 31.1, 31.1, 30.1, 30.7, 404590),
('2016-10-03 00:00:00', 30.7, 30.9, 30.4, 30.7, 355800),
('2016-10-04 00:00:00', 30.8, 30.8, 30.2, 30.4, 392890),
('2016-10-05 00:00:00', 30.5, 30.7, 30.4, 30.5, 207756),
('2016-10-06 00:00:00', 30.6, 31.4, 30.6, 31, 294240),
('2016-10-07 00:00:00', 31.1, 31.3, 30.6, 31, 260985),
('2016-10-10 00:00:00', 31, 31.2, 30.6, 31, 297850),
('2016-10-11 00:00:00', 31.1, 31.1, 30.6, 31.1, 387650),
('2016-10-12 00:00:00', 31.1, 32.4, 30.7, 31.4, 1021400),
('2016-10-13 00:00:00', 31.5, 31.7, 31.1, 31.4, 697106),
('2016-10-14 00:00:00', 31.4, 31.5, 31.3, 31.4, 240706),
('2016-10-17 00:00:00', 31.4, 31.4, 30.7, 30.9, 157080),
('2016-10-18 00:00:00', 31, 31.6, 30.3, 31.1, 478435),
('2016-10-19 00:00:00', 31.1, 31.3, 31.1, 31.1, 235906),
('2016-10-20 00:00:00', 31.2, 31.2, 30.5, 30.8, 390384),
('2016-10-21 00:00:00', 30.8, 31, 30, 30, 579405),
('2016-10-24 00:00:00', 30, 30.6, 29.7, 29.8, 103396),
('2016-10-25 00:00:00', 29, 29.9, 29, 29.6, 215720),
('2016-10-26 00:00:00', 29.3, 29.7, 29, 29.7, 157226),
('2016-10-27 00:00:00', 29.7, 30, 29.2, 29.6, 175410),
('2016-10-28 00:00:00', 29.6, 29.8, 29.3, 29.5, 238310),
('2016-10-31 00:00:00', 29.6, 29.7, 29.2, 29.5, 153400),
('2016-11-01 00:00:00', 29.6, 29.6, 29, 29.5, 93211),
('2016-11-02 00:00:00', 29.5, 29.5, 29, 29, 102420),
('2016-11-03 00:00:00', 29.2, 29.5, 28.1, 28.4, 224930),
('2016-11-04 00:00:00', 28.6, 28.7, 28.3, 28.4, 131750),
('2016-11-07 00:00:00', 28.6, 29.5, 28.1, 29.5, 326065),
('2016-11-08 00:00:00', 29.5, 29.9, 29.2, 29.3, 177410),
('2016-11-09 00:00:00', 29.3, 29.7, 28.3, 29, 229135),
('2016-11-10 00:00:00', 29.2, 29.4, 29, 29.1, 213795),
('2016-11-11 00:00:00', 29.1, 29.3, 28.8, 29, 86600),
('2016-11-14 00:00:00', 28.8, 29, 28.5, 28.8, 97070),
('2016-11-15 00:00:00', 28.8, 28.9, 27, 28.9, 176900),
('2016-11-16 00:00:00', 28.9, 29, 28.6, 28.8, 120220),
('2016-11-17 00:00:00', 28.8, 29.3, 28.5, 29.3, 340835),
('2016-11-25 00:00:00', 31.1, 31.1, 29.9, 29.9, 59471),
('2016-11-28 00:00:00', 29.9, 30, 28.8, 29.4, 17272),
('2016-11-29 00:00:00', 29.3, 29.5, 29, 29.4, 18496),
('2016-11-30 00:00:00', 29.4, 29.5, 29, 29.4, 27030),
('2016-12-01 00:00:00', 29.5, 29.6, 28.2, 28.2, 34043),
('2016-12-02 00:00:00', 28.2, 28.6, 27.8, 28.2, 33506),
('2016-12-05 00:00:00', 28.2, 28.2, 26.9, 27.3, 21756),
('2016-12-06 00:00:00', 27.3, 27.8, 27, 27.2, 11253),
('2016-12-07 00:00:00', 27.1, 27.25, 27, 27.1, 11322),
('2016-12-08 00:00:00', 27.3, 27.4, 27.1, 27.2, 6889),
('2016-12-09 00:00:00', 25.4, 27.1, 25.4, 26.1, 13482),
('2016-12-12 00:00:00', 26, 26.1, 24.6, 25, 10226),
('2016-12-13 00:00:00', 25.25, 25.25, 23.5, 25, 33381),
('2016-12-14 00:00:00', 25.1, 25.1, 24.9, 25, 18465),
('2016-12-15 00:00:00', 25.1, 25.15, 24.9, 25, 15755),
('2016-12-16 00:00:00', 25, 25.05, 24.9, 25, 15967),
('2016-12-19 00:00:00', 25.1, 25.1, 24.8, 25, 13124),
('2016-12-20 00:00:00', 25, 25, 24.85, 24.9, 9362),
('2016-12-21 00:00:00', 25, 25, 24.8, 24.9, 7553),
('2016-12-22 00:00:00', 24.95, 24.95, 24.6, 24.7, 9435),
('2016-12-23 00:00:00', 24.7, 24.7, 23.8, 24, 13048),
('2016-12-26 00:00:00', 24.2, 24.3, 23.5, 23.5, 9303),
('2016-12-27 00:00:00', 23.5, 23.5, 23.3, 23.4, 14486),
('2016-12-28 00:00:00', 23.4, 23.4, 22.9, 23, 10378),
('2016-12-29 00:00:00', 23, 23.1, 22.25, 22.25, 8239),
('2016-12-30 00:00:00', 22.25, 23.4, 22.1, 23.4, 38946),
('2017-01-03 00:00:00', 24, 24.85, 24, 24.6, 69408),
('2017-01-04 00:00:00', 25.2, 25.4, 24.5, 24.9, 74077),
('2017-01-05 00:00:00', 25, 25.4, 23.85, 25.4, 105702),
('2017-01-06 00:00:00', 25, 25.05, 24, 24.5, 82301),
('2017-01-09 00:00:00', 24.5, 26.2, 24.1, 26, 77744),
('2017-01-10 00:00:00', 25.1, 25.9, 24.6, 25.2, 103205),
('2017-01-11 00:00:00', 25.2, 25.2, 24.55, 24.95, 84040),
('2017-01-12 00:00:00', 24.95, 25.2, 24.2, 25.2, 87604),
('2017-01-13 00:00:00', 24.7, 24.8, 24.1, 24.8, 161260),
('2017-01-16 00:00:00', 24.5, 24.5, 23.5, 23.5, 77965),
('2017-01-17 00:00:00', 23.75, 25, 23, 25, 86076),
('2017-01-18 00:00:00', 23.5, 24.5, 23.25, 23.25, 265113),
('2017-01-19 00:00:00', 23.25, 23.8, 23.25, 23.7, 74753),
('2017-01-20 00:00:00', 23.3, 23.3, 22.65, 22.7, 134530),
('2017-01-23 00:00:00', 22.65, 23.15, 22.65, 22.65, 57081),
('2017-01-24 00:00:00', 22.55, 22.65, 21.6, 21.8, 97015),
('2017-01-25 00:00:00', 21.85, 22.15, 21.8, 21.9, 132125),
('2017-02-02 00:00:00', 21.9, 23.4, 21.9, 23.4, 108903),
('2017-02-03 00:00:00', 23.5, 24.1, 23.05, 23.35, 113196),
('2017-02-06 00:00:00', 23.6, 23.95, 23.45, 23.7, 78613),
('2017-02-07 00:00:00', 23.8, 24.15, 23.4, 23.9, 130850),
('2017-02-08 00:00:00', 23.9, 24, 23.6, 23.6, 79262),
('2017-02-09 00:00:00', 23.6, 23.65, 23.35, 23.45, 44947),
('2017-02-10 00:00:00', 23.45, 23.55, 23.1, 23.55, 59891),
('2017-02-13 00:00:00', 23.75, 24.8, 23.55, 24.65, 100181),
('2017-02-14 00:00:00', 24.9, 25.55, 24.85, 25.2, 148173),
('2017-02-15 00:00:00', 25.35, 26.1, 25.3, 25.9, 125776),
('2017-02-16 00:00:00', 26.2, 26.6, 25.1, 25.1, 127242),
('2017-02-17 00:00:00', 25.2, 26, 25.1, 26, 118083),
('2017-02-20 00:00:00', 26.6, 27.4, 26.35, 26.8, 154570),
('2017-02-21 00:00:00', 26.95, 26.95, 26.3, 26.5, 120848),
('2017-02-22 00:00:00', 26.5, 26.8, 26.2, 26.3, 131171),
('2017-02-23 00:00:00', 26.3, 26.85, 26.3, 26.5, 155078),
('2017-02-24 00:00:00', 26.5, 26.6, 26.1, 26.25, 87751),
('2017-02-27 00:00:00', 26.2, 26.3, 25.7, 25.8, 83641),
('2017-02-28 00:00:00', 25.9, 26.1, 25, 25, 145191),
('2017-03-01 00:00:00', 24.8, 25.6, 24.8, 25.2, 128538),
('2017-03-02 00:00:00', 25.5, 26.3, 25.25, 26.05, 107061),
('2017-03-03 00:00:00', 26.2, 26.8, 26.1, 26.55, 156496),
('2017-03-06 00:00:00', 26.3, 26.4, 25.6, 25.8, 162010),
('2017-03-07 00:00:00', 26, 26.15, 25.8, 25.85, 107960),
('2017-03-08 00:00:00', 25.85, 25.85, 25, 25, 162872),
('2017-03-09 00:00:00', 25, 25.7, 24.4, 25.4, 133796),
('2017-03-10 00:00:00', 25.5, 25.5, 25.05, 25.05, 45614),
('2017-03-13 00:00:00', 24.9, 24.9, 24.45, 24.45, 135156),
('2017-03-14 00:00:00', 24.4, 24.85, 24.2, 24.6, 83716),
('2017-03-15 00:00:00', 24.7, 24.7, 23.95, 24.2, 127701),
('2017-03-16 00:00:00', 24.2, 24.5, 24, 24.25, 144472),
('2017-03-17 00:00:00', 24.4, 25, 24.25, 24.75, 69674),
('2017-03-20 00:00:00', 24.75, 24.85, 24.6, 24.75, 33892),
('2017-03-21 00:00:00', 24.75, 24.75, 24.15, 24.25, 121897),
('2017-03-22 00:00:00', 24.8, 24.8, 24.2, 24.25, 77016),
('2017-03-23 00:00:00', 24.4, 24.4, 24.1, 24.25, 51034),
('2017-03-24 00:00:00', 24.3, 24.45, 24.05, 24.1, 58370),
('2017-03-27 00:00:00', 24.1, 24.3, 23.7, 23.7, 116103),
('2017-03-28 00:00:00', 23.8, 24.2, 23.55, 23.75, 65540),
('2017-03-29 00:00:00', 23.75, 24.35, 23.75, 24, 81085),
('2017-03-30 00:00:00', 24.2, 24.45, 24, 24.35, 137908),
('2017-03-31 00:00:00', 24.3, 24.8, 24.2, 24.5, 66640),
('2017-04-03 00:00:00', 24.7, 24.7, 24.2, 24.2, 53188),
('2017-04-04 00:00:00', 24.4, 24.9, 24.1, 24.8, 96372),
('2017-04-05 00:00:00', 24.95, 25.45, 24.9, 25.1, 256574),
('2017-04-07 00:00:00', 25.7, 25.7, 25.15, 25.35, 206295),
('2017-04-10 00:00:00', 25.5, 25.85, 25.5, 25.7, 167473),
('2017-04-11 00:00:00', 25.75, 25.9, 25.4, 25.5, 207173),
('2017-04-12 00:00:00', 25.5, 26.2, 25.3, 26, 274684),
('2017-04-13 00:00:00', 26, 26.6, 25.4, 25.4, 146300),
('2017-04-14 00:00:00', 25.3, 25.6, 24.8, 25.35, 162568),
('2017-04-17 00:00:00', 25.5, 25.75, 24.3, 24.3, 139713),
('2017-04-18 00:00:00', 24.4, 25, 24.1, 25, 103450),
('2017-04-19 00:00:00', 25, 25.3, 24.9, 25, 65843),
('2017-04-20 00:00:00', 25, 25.35, 24.8, 25, 61560),
('2017-04-21 00:00:00', 25.2, 25.25, 24.65, 24.85, 62417),
('2017-04-24 00:00:00', 24.8, 25.2, 24.6, 25, 53491),
('2017-04-25 00:00:00', 25, 25.2, 24.85, 25, 44461),
('2017-04-26 00:00:00', 25.05, 25.7, 24.95, 25.4, 101543),
('2017-04-27 00:00:00', 25.6, 25.8, 25.4, 25.55, 73341),
('2017-04-28 00:00:00', 25.5, 25.8, 25.2, 25.8, 76791),
('2017-05-03 00:00:00', 26, 27.6, 26, 27.6, 382948),
('2017-05-04 00:00:00', 28, 28.1, 26.95, 27, 187812),
('2017-05-05 00:00:00', 27.05, 28.5, 27, 28, 183481),
('2017-05-08 00:00:00', 28.6, 29.3, 28.4, 28.55, 263182),
('2017-05-09 00:00:00', 28.75, 29.2, 28.1, 28.6, 153663),
('2017-05-10 00:00:00', 28.6, 30.5, 28.6, 29.75, 233365),
('2017-05-11 00:00:00', 29.85, 31, 29.8, 31, 220048),
('2017-05-15 00:00:00', 31.2, 31.65, 30.2, 30.3, 267111),
('2017-05-16 00:00:00', 30, 30.1, 28.8, 28.8, 351497),
('2017-05-22 00:00:00', 30.7, 31.4, 30, 30, 172157),
('2017-05-23 00:00:00', 30, 31, 29.7, 30.3, 148209),
('2017-05-24 00:00:00', 30.3, 32.4, 30.3, 32.4, 273167),
('2017-05-25 00:00:00', 32.4, 33.3, 32, 32.5, 143421),
('2017-05-31 00:00:00', 30, 31, 29.3, 30.5, 233930),
('2017-06-01 00:00:00', 30.5, 32.45, 30.5, 32.3, 100193),
('2017-06-05 00:00:00', 31.8, 32.5, 31.7, 32.2, 69967),
('2017-06-07 00:00:00', 32.5, 33.2, 32, 32.5, 152837),
('2017-06-08 00:00:00', 32.5, 32.55, 30.8, 32, 254370),
('2017-06-09 00:00:00', 32.3, 32.6, 31.7, 32, 91208),
('2017-06-12 00:00:00', 32, 32, 30.65, 30.7, 163613),
('2017-06-13 00:00:00', 30.7, 31.6, 30.6, 31.3, 129296),
('2017-06-14 00:00:00', 31.8, 32, 31.2, 31.4, 121463),
('2017-06-15 00:00:00', 31.4, 31.5, 30.5, 31.35, 162606),
('2017-06-19 00:00:00', 31.65, 33.3, 31.65, 33, 334522),
('2017-06-20 00:00:00', 33.2, 33.9, 33, 33.3, 173567),
('2017-06-21 00:00:00', 33.35, 35.2, 32.7, 35.2, 201966),
('2017-06-22 00:00:00', 35.6, 36.3, 34.9, 35, 195612),
('2017-06-26 00:00:00', 35.5, 35.9, 35, 35.1, 136265),
('2017-06-27 00:00:00', 35.5, 35.5, 34.1, 34.4, 261821),
('2017-07-03 00:00:00', 34.55, 34.7, 34.2, 34.2, 92541),
('2017-07-04 00:00:00', 34.1, 34.3, 33.4, 33.75, 175783),
('2017-07-05 00:00:00', 33.6, 34.55, 33.5, 34.3, 100575),
('2017-07-10 00:00:00', 34.2, 34.8, 33.7, 33.8, 99160),
('2017-07-11 00:00:00', 33.7, 33.8, 32.4, 33.4, 179613),
('2017-07-12 00:00:00', 33.7, 34, 33.5, 33.7, 74646),
('2017-07-13 00:00:00', 34.2, 34.6, 33.9, 34.15, 125609),
('2017-07-17 00:00:00', 33.6, 33.75, 32.5, 32.7, 189643),
('2017-07-18 00:00:00', 32.5, 32.5, 31.5, 31.5, 136098),
('2017-07-19 00:00:00', 31.6, 32.85, 31.5, 32.4, 117773),
('2017-07-24 00:00:00', 31.7, 32, 31.45, 31.6, 72779),
('2017-07-25 00:00:00', 31.9, 32.4, 31.6, 32.35, 50855),
('2017-07-26 00:00:00', 32.4, 33, 32.3, 33, 61651),
('2017-07-27 00:00:00', 33, 33.5, 32.6, 33.2, 107922),
('2017-07-31 00:00:00', 33.25, 33.7, 32.7, 32.9, 129208),
('2017-08-01 00:00:00', 32.8, 32.9, 32.3, 32.3, 88948),
('2017-08-02 00:00:00', 32.1, 32.4, 31.8, 32.2, 68475),
('2017-08-03 00:00:00', 32.1, 33, 32.1, 32.6, 57681),
('2017-08-07 00:00:00', 32.2, 32.4, 31.8, 32.25, 107977),
('2017-08-08 00:00:00', 32.4, 32.95, 32.2, 32.6, 107287),
('2017-08-09 00:00:00', 32.6, 32.8, 31.8, 32.2, 76284),
('2017-08-10 00:00:00', 32, 32.45, 32, 32.2, 32452),
('2017-08-14 00:00:00', 32, 33.4, 31.9, 33.4, 179454),
('2017-08-15 00:00:00', 33.5, 33.5, 32.9, 33.1, 97021),
('2017-08-16 00:00:00', 33, 33.9, 32.7, 33.85, 149488),
('2017-08-17 00:00:00', 33.8, 34.45, 33.1, 33.1, 148357),
('2017-08-21 00:00:00', 32.9, 33.5, 32.75, 32.8, 69703),
('2017-08-22 00:00:00', 32.95, 32.95, 31.8, 32, 174013),
('2017-08-23 00:00:00', 32, 32.4, 31.8, 32.1, 71972),
('2017-08-24 00:00:00', 32.25, 32.55, 32, 32.15, 60507),
('2017-08-25 00:00:00', 32.2, 32.45, 31.95, 31.95, 69474),
('2017-08-28 00:00:00', 32, 32.2, 31.5, 31.9, 132383),
('2017-08-29 00:00:00', 32, 32.9, 31.8, 32.2, 101590),
('2017-08-30 00:00:00', 32, 32.35, 31.8, 32.1, 90959),
('2017-08-31 00:00:00', 32, 32.6, 32, 32.4, 86616),
('2017-09-05 00:00:00', 32.5, 32.5, 32, 32.05, 68720),
('2017-09-06 00:00:00', 31.9, 32.6, 31.8, 32.45, 109691),
('2017-09-07 00:00:00', 32.6, 33.3, 32.5, 33.05, 244349),
('2017-09-11 00:00:00', 32.6, 33.05, 32.4, 32.65, 97959),
('2017-09-12 00:00:00', 32.6, 34.8, 32.6, 34.8, 374712),
('2017-09-13 00:00:00', 34.95, 35.6, 34.5, 35.1, 257723),
('2017-09-14 00:00:00', 35.1, 35.3, 34.55, 34.55, 196436),
('2017-09-18 00:00:00', 35.7, 36.45, 34.8, 34.8, 314497),
('2017-09-19 00:00:00', 34.7, 35.4, 34.6, 34.6, 158824),
('2017-09-20 00:00:00', 34.7, 35, 34.35, 34.7, 151085),
('2017-09-25 00:00:00', 35.4, 36.1, 35.1, 35.1, 136340),
('2017-09-26 00:00:00', 35.1, 35.3, 34.7, 34.7, 139626),
('2017-10-02 00:00:00', 34.3, 34.6, 33.75, 33.85, 61936),
('2017-10-03 00:00:00', 33.75, 33.85, 33, 33.4, 143588),
('2017-10-04 00:00:00', 33.35, 34.3, 33.3, 34.3, 92354),
('2017-10-05 00:00:00', 34.1, 34.6, 33.9, 34, 76774),
('2017-10-09 00:00:00', 33.95, 34.5, 33.75, 34.35, 82500),
('2017-10-10 00:00:00', 34.5, 35.15, 34.35, 35.15, 148090),
('2017-10-11 00:00:00', 35.4, 35.4, 34.5, 34.75, 97235),
('2017-10-12 00:00:00', 34.7, 34.95, 34.6, 34.65, 60118),
('2017-10-16 00:00:00', 34.75, 35, 34.6, 34.7, 81476),
('2017-10-17 00:00:00', 35.2, 35.8, 35.2, 35.25, 315397),
('2017-10-18 00:00:00', 35.3, 35.75, 34.9, 34.9, 165455),
('2017-10-19 00:00:00', 35, 35.2, 34.65, 34.65, 89465),
('2017-10-23 00:00:00', 34, 34, 33.2, 33.3, 149749),
('2017-10-24 00:00:00', 33.3, 33.6, 33.25, 33.55, 77249),
('2017-10-25 00:00:00', 33.55, 33.9, 33.55, 33.85, 35563),
('2017-10-26 00:00:00', 33.8, 33.85, 33.1, 33.25, 75490),
('2017-10-30 00:00:00', 32.8, 32.95, 30.9, 30.9, 165203),
('2017-10-31 00:00:00', 30.85, 31.4, 29.1, 30.3, 157473),
('2017-11-01 00:00:00', 30.3, 31, 30.3, 30.45, 67461),
('2017-11-02 00:00:00', 30.45, 31.3, 29.6, 30, 115674),
('2017-11-06 00:00:00', 30.8, 30.9, 30.35, 30.8, 59834),
('2017-11-07 00:00:00', 30.95, 31.3, 30.6, 30.9, 113056),
('2017-11-08 00:00:00', 30.9, 30.9, 30, 30, 133975),
('2017-11-09 00:00:00', 30.05, 30.4, 29.6, 30.05, 124408),
('2017-11-13 00:00:00', 30, 30.1, 28.1, 28.1, 260571),
('2017-11-15 00:00:00', 30.4, 31.15, 30.2, 31, 188621),
('2017-11-16 00:00:00', 30.5, 31.4, 30.4, 31, 159874),
('2017-11-20 00:00:00', 30.6, 31.6, 29.6, 31.3, 248961),
('2017-11-21 00:00:00', 31.05, 31.7, 30.6, 31.4, 249119),
('2017-11-22 00:00:00', 31.4, 31.45, 30.95, 30.95, 101346),
('2017-11-23 00:00:00', 30.85, 31.25, 30.55, 31.2, 165667),
('2017-11-27 00:00:00', 31.5, 32.4, 31.4, 32.2, 179598),
('2017-11-28 00:00:00', 32.25, 32.6, 31.7, 31.8, 102409),
('2017-11-29 00:00:00', 31.8, 32.45, 31.6, 32.1, 139233),
('2017-11-30 00:00:00', 32.1, 32.4, 31.85, 32.1, 99230),
('2017-12-04 00:00:00', 32, 32.8, 32, 32.35, 149928),
('2017-12-05 00:00:00', 32.6, 32.7, 31.9, 31.9, 138941),
('2017-12-06 00:00:00', 31.8, 31.85, 31.1, 31.15, 114574),
('2017-12-11 00:00:00', 30.5, 30.95, 30.2, 30.55, 95530),
('2017-12-12 00:00:00', 30.6, 30.85, 29.4, 30.75, 147671),
('2017-12-13 00:00:00', 30.9, 31.15, 30.55, 30.55, 58526),
('2017-12-14 00:00:00', 30.6, 31.25, 30.45, 31.1, 188403),
('2017-12-18 00:00:00', 32.25, 32.8, 32.25, 32.45, 123460),
('2017-12-19 00:00:00', 32.45, 32.85, 32, 32.4, 162677),
('2017-12-20 00:00:00', 32.5, 33.15, 32.3, 32.5, 216902),
('2017-12-21 00:00:00', 32.8, 33.35, 32.55, 32.7, 123259),
('2017-12-25 00:00:00', 33.2, 33.45, 32.5, 32.8, 107260),
('2017-12-26 00:00:00', 32.9, 33.05, 32.55, 32.8, 114462),
('2017-12-27 00:00:00', 33, 33, 32.45, 32.75, 125251),
('2017-12-28 00:00:00', 32.75, 32.85, 32.5, 32.75, 116748),
('2018-01-03 00:00:00', 33, 33.15, 32.5, 32.95, 144331),
('2018-01-08 00:00:00', 32.6, 33.6, 32.25, 33.55, 220489),
('2018-01-09 00:00:00', 33.6, 34, 33.55, 33.95, 164117),
('2018-01-10 00:00:00', 34, 34.15, 33.5, 34, 118541),
('2018-02-05 00:00:00', 28.7, 29, 26.85, 26.85, 90020),
('2018-02-06 00:00:00', 25, 26.4, 25, 25, 151986),
('2018-02-12 00:00:00', 27.3, 27.95, 27.2, 27.7, 113663),
('2018-02-22 00:00:00', 29.35, 29.4, 28.3, 28.45, 134415),
('2018-02-26 00:00:00', 29, 29.2, 28.6, 28.65, 137914),
('2018-02-27 00:00:00', 28.6, 28.6, 27.8, 27.9, 124881),
('2018-02-28 00:00:00', 27.6, 28.7, 27.5, 28.2, 92952),
('2018-03-01 00:00:00', 28.2, 28.2, 27.65, 27.7, 108355),
('2018-03-02 00:00:00', 27.3, 27.8, 27.2, 27.6, 89400),
('2018-03-05 00:00:00', 27.8, 27.8, 26.9, 26.9, 117179),
('2018-03-06 00:00:00', 26.95, 27.2, 26.7, 26.9, 91950),
('2018-03-07 00:00:00', 26.9, 28, 26.9, 27.8, 155533),
('2018-03-08 00:00:00', 28, 28, 27.1, 27.1, 52229),
('2018-03-09 00:00:00', 27.2, 27.5, 26.75, 26.8, 110103),
('2018-03-12 00:00:00', 26.9, 26.9, 26.2, 26.25, 96173),
('2018-03-13 00:00:00', 26.45, 27.05, 26.2, 26.55, 132717),
('2018-03-14 00:00:00', 26.55, 27.5, 26.5, 27.45, 131683),
('2018-03-15 00:00:00', 27.15, 27.3, 26.6, 26.85, 76857),
('2018-03-16 00:00:00', 26.95, 27, 26.65, 26.7, 118773),
('2018-03-19 00:00:00', 26.7, 26.9, 26.4, 26.45, 126170),
('2018-03-20 00:00:00', 26.45, 26.85, 26.3, 26.55, 54494),
('2018-03-21 00:00:00', 26.55, 27, 26.5, 27, 139794),
('2018-03-22 00:00:00', 27.1, 27.85, 27.1, 27.45, 166873),
('2018-03-23 00:00:00', 27, 27.1, 26.5, 26.9, 61548),
('2018-03-26 00:00:00', 26.9, 26.9, 26, 26.1, 121016),
('2018-03-27 00:00:00', 26.3, 26.6, 26.25, 26.3, 103928),
('2018-03-28 00:00:00', 26.3, 26.3, 26, 26.05, 209764),
('2018-03-29 00:00:00', 26, 26.05, 25.4, 25.6, 145473),
('2018-03-30 00:00:00', 25.5, 25.8, 24.65, 24.8, 102546),
('2018-04-02 00:00:00', 24.8, 25.2, 23.3, 23.5, 145368),
('2018-04-03 00:00:00', 23.2, 25.1, 22.65, 25.1, 130753),
('2018-04-04 00:00:00', 25.5, 26.8, 25.45, 26.5, 102995),
('2018-04-05 00:00:00', 26.5, 26.5, 25, 25.95, 91955),
('2018-04-06 00:00:00', 25.5, 26.1, 25.5, 25.9, 170639),
('2018-04-09 00:00:00', 20.8, 21.3, 20.8, 21.3, 161546),
('2018-04-10 00:00:00', 21.5, 22.4, 21.5, 22, 131132),
('2018-04-11 00:00:00', 22.3, 22.35, 21.15, 21.15, 77868),
('2018-04-12 00:00:00', 21.15, 21.2, 20.5, 20.8, 41786),
('2018-04-13 00:00:00', 21, 21.3, 20.6, 20.6, 53765),
('2018-04-16 00:00:00', 20.5, 21.9, 20.5, 21.9, 132406),
('2018-04-17 00:00:00', 22.2, 22.35, 21.2, 21.85, 50684),
('2018-04-18 00:00:00', 21.7, 21.95, 21.3, 21.3, 44734),
('2018-04-19 00:00:00', 21.3, 21.45, 20.7, 20.9, 71276),
('2018-04-20 00:00:00', 20.9, 20.95, 20.35, 20.8, 48440),
('2018-04-23 00:00:00', 21, 21.15, 20.95, 21.05, 114694),
('2018-04-24 00:00:00', 21, 21, 20, 20.65, 158453),
('2018-04-26 00:00:00', 20.65, 20.85, 19.65, 19.75, 51778),
('2018-04-27 00:00:00', 19.7, 20.1, 19.3, 20, 41238),
('2018-05-02 00:00:00', 19.5, 20.05, 19.3, 19.9, 62604);
INSERT INTO `stock_info_aaa` (`date`, `open`, `high`, `low`, `close`, `volume`) VALUES
('2018-05-03 00:00:00', 19.35, 19.5, 18.95, 19.4, 34253),
('2018-05-04 00:00:00', 19.5, 19.85, 19.35, 19.45, 31742),
('2018-05-07 00:00:00', 19.4, 19.45, 18.8, 18.95, 61709),
('2018-05-08 00:00:00', 18.9, 19.95, 18.75, 19.4, 125031),
('2018-05-09 00:00:00', 19.4, 19.85, 19.05, 19.2, 66664),
('2018-05-10 00:00:00', 19.2, 19.7, 19, 19, 69596),
('2018-05-11 00:00:00', 19, 19.5, 18.8, 19.25, 24094),
('2018-05-14 00:00:00', 19.3, 19.8, 19, 19.3, 38057),
('2018-05-15 00:00:00', 19.3, 19.9, 19.3, 19.6, 44193),
('2018-05-16 00:00:00', 19.6, 19.75, 19.4, 19.6, 22342),
('2018-05-17 00:00:00', 19.55, 19.75, 19.4, 19.6, 17571),
('2018-05-18 00:00:00', 19.7, 19.7, 19.1, 19.2, 16706),
('2018-05-21 00:00:00', 19.2, 19.25, 18.95, 18.95, 13828),
('2018-05-22 00:00:00', 18.85, 18.9, 18, 18.35, 43694),
('2018-05-23 00:00:00', 18.1, 19.6, 17.9, 19.6, 201983),
('2018-05-24 00:00:00', 19.6, 20.75, 19.5, 20.4, 232972),
('2018-05-25 00:00:00', 20.4, 20.85, 20.4, 20.7, 216480),
('2018-05-28 00:00:00', 20.7, 20.75, 19.7, 20, 221561),
('2018-05-29 00:00:00', 19.9, 20.5, 19.6, 20.1, 154420),
('2018-05-30 00:00:00', 20.1, 20.4, 19.7, 19.9, 30731),
('2018-05-31 00:00:00', 19.85, 20.5, 19.6, 20.2, 132335),
('2018-06-01 00:00:00', 20.2, 21.3, 20.2, 21.1, 194084),
('2018-06-04 00:00:00', 21.5, 22.55, 21.5, 22.55, 227386),
('2018-06-05 00:00:00', 22.8, 22.85, 22.05, 22.55, 183478),
('2018-06-06 00:00:00', 22.3, 23, 21.5, 23, 189451),
('2018-06-07 00:00:00', 23, 23, 22, 22, 107798),
('2018-06-11 00:00:00', 21.5, 21.85, 21.1, 21.1, 158837),
('2018-06-12 00:00:00', 20.85, 21, 20.3, 20.55, 49022),
('2018-06-13 00:00:00', 20.55, 21.35, 20.55, 20.95, 19427),
('2018-06-14 00:00:00', 20.95, 21.4, 20.75, 21.3, 178307),
('2018-06-15 00:00:00', 21.1, 21.45, 20.9, 20.95, 95626),
('2018-06-18 00:00:00', 20.2, 20.75, 19.8, 19.8, 229847),
('2018-06-19 00:00:00', 19.2, 19.4, 18.5, 18.7, 157355),
('2018-06-20 00:00:00', 18.9, 19.85, 18.7, 19.65, 209238),
('2018-06-21 00:00:00', 19.65, 19.75, 19.15, 19.2, 204496),
('2018-06-22 00:00:00', 19.05, 19.65, 19.05, 19.6, 238800),
('2018-06-25 00:00:00', 19.6, 19.95, 19.4, 19.45, 206944),
('2018-06-26 00:00:00', 19.5, 19.5, 19.2, 19.3, 200220),
('2018-06-27 00:00:00', 19.3, 19.4, 18, 18.85, 131326),
('2018-06-28 00:00:00', 18.6, 19.15, 18.6, 18.9, 147432),
('2018-06-29 00:00:00', 18.9, 19.15, 18.8, 18.9, 79965),
('2018-07-02 00:00:00', 18.9, 19.1, 18.25, 18.25, 273598),
('2018-07-03 00:00:00', 18.25, 18.85, 18.25, 18.3, 312320),
('2018-07-04 00:00:00', 18.3, 18.6, 18.05, 18.15, 170308),
('2018-07-05 00:00:00', 18.4, 18.4, 17, 17.5, 252480),
('2018-07-06 00:00:00', 17.5, 18.25, 17.15, 18.25, 262116),
('2018-07-09 00:00:00', 18, 18.45, 17.8, 17.85, 167313),
('2018-07-10 00:00:00', 18, 18.15, 17.65, 17.85, 158178),
('2018-07-11 00:00:00', 17.65, 17.7, 16.75, 16.8, 218571),
('2018-07-12 00:00:00', 17, 17.25, 16.95, 17, 163346),
('2018-07-13 00:00:00', 17.1, 17.25, 16.95, 17.15, 161816),
('2018-07-16 00:00:00', 17.3, 17.3, 17.1, 17.1, 181008),
('2018-07-17 00:00:00', 17.2, 17.9, 17.05, 17.85, 259278),
('2018-07-18 00:00:00', 17.9, 18.25, 17.9, 18.2, 169306),
('2018-07-19 00:00:00', 18.2, 18.2, 17.9, 18.1, 171666),
('2018-07-20 00:00:00', 17.85, 18, 17.6, 17.8, 167399),
('2018-07-24 00:00:00', 17.8, 17.95, 17.5, 17.8, 181793),
('2018-07-25 00:00:00', 17.95, 18, 17.35, 17.35, 236798),
('2018-07-26 00:00:00', 17.3, 17.4, 16.85, 17, 226219),
('2018-07-27 00:00:00', 17, 17.55, 17, 17.4, 264076),
('2018-07-30 00:00:00', 17.45, 17.6, 17.3, 17.45, 200325),
('2018-07-31 00:00:00', 17.4, 17.45, 17.15, 17.15, 198900),
('2018-08-01 00:00:00', 17.1, 17.5, 17.1, 17.3, 246249),
('2018-08-02 00:00:00', 17.35, 17.4, 16.95, 17.2, 218039),
('2018-08-03 00:00:00', 17.25, 17.3, 17.05, 17.1, 165617),
('2018-08-06 00:00:00', 17.15, 17.2, 16.85, 16.95, 183122),
('2018-08-07 00:00:00', 16.95, 16.95, 16.7, 16.8, 55885),
('2018-08-08 00:00:00', 16.8, 17, 16.65, 16.75, 117646),
('2018-08-09 00:00:00', 16.7, 16.85, 16.65, 16.75, 80950),
('2018-08-10 00:00:00', 16.85, 16.85, 16.4, 16.4, 96534),
('2018-08-13 00:00:00', 16.6, 16.85, 16.45, 16.85, 90242),
('2018-08-14 00:00:00', 16.95, 17, 16.6, 16.65, 87730),
('2018-08-15 00:00:00', 16.65, 16.85, 16.5, 16.7, 100070),
('2018-08-16 00:00:00', 16.65, 16.7, 16.45, 16.7, 130702),
('2018-08-17 00:00:00', 16.7, 16.75, 16.45, 16.45, 112654),
('2018-08-20 00:00:00', 16.5, 16.65, 16.25, 16.25, 73046),
('2018-08-21 00:00:00', 16.25, 16.5, 16.25, 16.35, 76039),
('2018-08-22 00:00:00', 16.4, 17.2, 16.4, 17.1, 235630),
('2018-08-23 00:00:00', 17.2, 17.25, 17, 17.05, 100547),
('2018-08-24 00:00:00', 16.9, 17.15, 16.8, 17.15, 117427),
('2018-08-27 00:00:00', 17.15, 17.25, 16.95, 17, 145770),
('2018-08-28 00:00:00', 17.1, 17.15, 16.85, 16.9, 94930),
('2018-08-29 00:00:00', 17.05, 17.35, 16.8, 17.35, 207664),
('2018-08-30 00:00:00', 17.4, 18.2, 17.4, 18.1, 381446),
('2018-08-31 00:00:00', 18.1, 18.3, 17.8, 17.8, 294618),
('2018-09-04 00:00:00', 17.7, 17.9, 17.2, 17.3, 195552),
('2018-09-05 00:00:00', 17.3, 17.8, 17.1, 17.6, 272797),
('2018-09-06 00:00:00', 17.6, 17.75, 17.2, 17.2, 171249),
('2018-09-07 00:00:00', 17.45, 17.6, 17.25, 17.3, 153139),
('2018-09-10 00:00:00', 17.2, 17.4, 16.95, 17, 109269),
('2018-09-11 00:00:00', 16.9, 17.2, 16.9, 17.1, 113532),
('2018-09-12 00:00:00', 17.05, 17.2, 16.9, 16.9, 131656),
('2018-09-13 00:00:00', 16.9, 17.1, 16.85, 16.95, 104885),
('2018-09-14 00:00:00', 17.1, 17.1, 16.8, 16.85, 131510),
('2018-09-17 00:00:00', 16.9, 17, 16.7, 16.7, 128292),
('2018-09-18 00:00:00', 16.65, 17.05, 16.6, 17, 168350),
('2018-09-19 00:00:00', 17.15, 17.5, 17.1, 17.3, 215304),
('2018-09-20 00:00:00', 17.45, 17.45, 17.2, 17.35, 147152),
('2018-09-21 00:00:00', 17.45, 17.45, 17.05, 17.15, 171116),
('2018-09-24 00:00:00', 17.25, 17.5, 17.25, 17.5, 223530),
('2018-09-25 00:00:00', 17.5, 17.9, 17.5, 17.7, 212284),
('2018-09-26 00:00:00', 17.7, 17.75, 17.55, 17.6, 172083),
('2018-09-27 00:00:00', 17.7, 17.95, 17.7, 17.8, 239887),
('2018-09-28 00:00:00', 18, 18.05, 17.45, 17.5, 241116),
('2018-10-01 00:00:00', 17.55, 17.65, 17.2, 17.25, 110186),
('2018-10-02 00:00:00', 17.15, 17.25, 16.95, 16.95, 181056),
('2018-10-03 00:00:00', 16.95, 17.2, 16.9, 17.1, 87073),
('2018-10-04 00:00:00', 17.1, 17.3, 17.1, 17.15, 139677),
('2018-10-05 00:00:00', 17.2, 17.25, 17, 17, 98247),
('2018-10-08 00:00:00', 16.9, 17.2, 16.8, 16.8, 152491),
('2018-10-09 00:00:00', 16.7, 16.85, 16.4, 16.4, 267632),
('2018-10-10 00:00:00', 16.4, 16.45, 15.85, 15.85, 304384),
('2018-10-11 00:00:00', 15, 15.2, 14.75, 14.75, 316659),
('2018-10-12 00:00:00', 14.5, 15.4, 14.5, 15.2, 223129),
('2018-10-15 00:00:00', 15.5, 15.7, 15.4, 15.5, 138746),
('2018-10-16 00:00:00', 15.5, 15.55, 15.15, 15.4, 124360),
('2018-10-17 00:00:00', 15.45, 15.75, 15.35, 15.5, 160941),
('2018-10-18 00:00:00', 15.35, 15.5, 15, 15, 143744),
('2018-10-19 00:00:00', 14.85, 15, 14.55, 14.75, 212613),
('2018-10-22 00:00:00', 14.85, 15, 14.8, 14.8, 170140),
('2018-10-23 00:00:00', 14.9, 14.9, 14.25, 14.5, 178809),
('2018-10-24 00:00:00', 14.65, 14.7, 14.3, 14.45, 130698),
('2018-10-25 00:00:00', 13.6, 14.7, 13.6, 14.15, 285442),
('2018-10-26 00:00:00', 14.5, 14.65, 14.2, 14.2, 190302),
('2018-10-29 00:00:00', 14.4, 14.4, 14, 14.25, 168945),
('2018-10-30 00:00:00', 14.25, 14.45, 14.2, 14.3, 205894),
('2018-10-31 00:00:00', 14.45, 14.65, 14.4, 14.6, 254902),
('2018-11-01 00:00:00', 14.6, 14.6, 14.1, 14.15, 143160),
('2018-11-02 00:00:00', 14.3, 14.3, 14.05, 14.15, 112584),
('2018-11-05 00:00:00', 14.1, 14.3, 14.1, 14.25, 79516),
('2018-11-06 00:00:00', 14.35, 14.45, 14.3, 14.4, 62475),
('2018-11-07 00:00:00', 14.4, 14.45, 14.25, 14.4, 73082),
('2018-11-08 00:00:00', 14.5, 15.2, 14.4, 15.1, 254688),
('2018-11-09 00:00:00', 15.1, 15.15, 14.7, 14.7, 91197),
('2018-11-12 00:00:00', 14.5, 14.75, 14.45, 14.6, 104887),
('2018-11-13 00:00:00', 14.25, 14.4, 14, 14.15, 110485),
('2018-11-14 00:00:00', 14.3, 14.45, 14.1, 14.1, 121636),
('2018-11-15 00:00:00', 14.2, 14.25, 13.5, 13.75, 111559),
('2018-11-16 00:00:00', 13.9, 14.15, 13.75, 14, 164947),
('2018-11-19 00:00:00', 14, 14.2, 13.8, 13.85, 86491),
('2018-11-20 00:00:00', 13.85, 14.8, 13.8, 14.8, 449790),
('2018-11-21 00:00:00', 14.9, 15.3, 14.65, 14.85, 373017),
('2018-11-22 00:00:00', 14.95, 15.05, 14.9, 14.95, 132261),
('2018-11-23 00:00:00', 14.95, 15.25, 14.85, 15.1, 259360),
('2018-11-26 00:00:00', 15.25, 16, 15.25, 15.5, 315301),
('2018-11-27 00:00:00', 15.8, 15.9, 15.3, 15.55, 252865),
('2018-11-28 00:00:00', 15.55, 15.65, 15.3, 15.4, 161227),
('2018-11-29 00:00:00', 15.5, 15.7, 14.95, 14.95, 156800),
('2018-11-30 00:00:00', 14.95, 15, 14.75, 14.85, 105548),
('2018-12-03 00:00:00', 15, 15.45, 15, 15.25, 203345),
('2018-12-04 00:00:00', 15.4, 15.75, 15.4, 15.55, 287804),
('2018-12-05 00:00:00', 15.5, 16.2, 15.35, 16.15, 280947),
('2018-12-06 00:00:00', 16.1, 16.25, 15.8, 15.85, 191345),
('2018-12-07 00:00:00', 15.9, 16.05, 15.8, 15.9, 191272),
('2018-12-10 00:00:00', 15.7, 16.7, 15.7, 16.4, 282098),
('2018-12-11 00:00:00', 16.75, 16.9, 16.45, 16.5, 287303),
('2018-12-12 00:00:00', 16.6, 16.9, 16.5, 16.5, 188706),
('2018-12-13 00:00:00', 16.6, 16.65, 16.4, 16.4, 151403),
('2018-12-14 00:00:00', 16.4, 16.7, 16.3, 16.45, 186324),
('2018-12-17 00:00:00', 16.4, 16.5, 16.1, 16.1, 155845),
('2018-12-18 00:00:00', 15.8, 15.9, 15.3, 15.7, 215212),
('2018-12-19 00:00:00', 15.7, 15.9, 15.25, 15.25, 144103),
('2018-12-20 00:00:00', 15.05, 15.55, 15.05, 15.5, 107877),
('2018-12-21 00:00:00', 15.25, 15.5, 15.15, 15.15, 122705),
('2018-12-24 00:00:00', 15.2, 15.35, 14.8, 14.8, 193442),
('2018-12-25 00:00:00', 14.3, 14.65, 13.95, 14.5, 253085),
('2018-12-26 00:00:00', 14.55, 14.7, 14.45, 14.5, 133139),
('2018-12-27 00:00:00', 14.95, 15.1, 14.8, 14.9, 146766),
('2018-12-28 00:00:00', 14.9, 15.1, 14.55, 14.7, 125725),
('2019-01-02 00:00:00', 14.85, 15, 14.5, 14.5, 100572),
('2019-01-03 00:00:00', 14.45, 14.7, 14.15, 14.25, 137680),
('2019-01-04 00:00:00', 14.15, 14.4, 13.9, 14.25, 162716),
('2019-01-07 00:00:00', 14.5, 14.55, 14.3, 14.4, 110429),
('2019-01-08 00:00:00', 14.5, 14.5, 13.8, 14.2, 90634),
('2019-01-09 00:00:00', 14.2, 14.6, 14.2, 14.55, 139962),
('2019-01-10 00:00:00', 14.7, 14.7, 14.4, 14.4, 97195),
('2019-01-11 00:00:00', 14.5, 14.55, 14.35, 14.35, 132256),
('2019-01-14 00:00:00', 14.4, 14.5, 14.2, 14.2, 110751),
('2019-01-15 00:00:00', 14.3, 14.7, 14.15, 14.6, 222989),
('2019-01-16 00:00:00', 14.75, 15.05, 14.75, 14.85, 168005),
('2019-01-17 00:00:00', 14.9, 14.95, 14.6, 14.6, 136316),
('2019-01-18 00:00:00', 14.6, 14.75, 14.4, 14.4, 118066),
('2019-01-21 00:00:00', 14.4, 14.75, 14.35, 14.4, 183883),
('2019-01-22 00:00:00', 14.6, 14.75, 14.4, 14.5, 134654),
('2019-01-23 00:00:00', 14.55, 14.55, 14.35, 14.4, 118974),
('2019-01-24 00:00:00', 14.45, 14.6, 14.35, 14.45, 139245),
('2019-01-25 00:00:00', 14.55, 14.55, 14.3, 14.35, 128898),
('2019-01-28 00:00:00', 14.5, 14.5, 14.25, 14.25, 134166),
('2019-01-29 00:00:00', 14.3, 14.45, 14.15, 14.25, 150426),
('2019-01-30 00:00:00', 14.35, 14.4, 14.25, 14.3, 127989),
('2019-01-31 00:00:00', 14.35, 14.65, 14.3, 14.5, 175872),
('2019-02-01 00:00:00', 14.55, 14.7, 14.4, 14.7, 138725),
('2019-02-11 00:00:00', 14.85, 14.95, 14.75, 14.85, 136522),
('2019-02-12 00:00:00', 14.9, 15.55, 14.9, 15.4, 243114),
('2019-02-13 00:00:00', 15.5, 15.65, 15.3, 15.55, 199265),
('2019-02-14 00:00:00', 15.6, 15.7, 15.45, 15.5, 140567),
('2019-02-15 00:00:00', 15.4, 15.55, 15.35, 15.45, 147425),
('2019-02-18 00:00:00', 15.65, 15.65, 15.35, 15.45, 136284),
('2019-02-19 00:00:00', 15.45, 15.5, 15, 15, 200921),
('2019-02-20 00:00:00', 15.05, 15.25, 14.95, 15, 163801),
('2019-02-21 00:00:00', 15, 15.25, 14.95, 15.05, 121914),
('2019-02-22 00:00:00', 15.05, 15.4, 14.95, 15.25, 163944),
('2019-02-25 00:00:00', 15.25, 15.4, 15.15, 15.2, 130938),
('2019-02-26 00:00:00', 15.2, 15.25, 15, 15.05, 123538),
('2019-02-27 00:00:00', 15.1, 15.5, 15.1, 15.3, 212578),
('2019-02-28 00:00:00', 15.45, 15.5, 15.05, 15.05, 135478),
('2019-03-01 00:00:00', 15.1, 15.4, 15.1, 15.4, 147178),
('2019-03-04 00:00:00', 15.5, 16.45, 15.5, 16.45, 362984),
('2019-03-05 00:00:00', 16.6, 17.45, 16.5, 16.6, 470747),
('2019-03-06 00:00:00', 16.4, 16.7, 16.3, 16.65, 243582),
('2019-03-07 00:00:00', 16.95, 17.05, 16.45, 16.45, 352217),
('2019-03-08 00:00:00', 16.3, 16.35, 15.8, 15.8, 318649),
('2019-03-11 00:00:00', 15.9, 16.35, 15.75, 16.35, 280912),
('2019-03-12 00:00:00', 16.6, 16.7, 16.35, 16.45, 263094),
('2019-03-13 00:00:00', 16.5, 16.55, 16.2, 16.2, 246147),
('2019-03-14 00:00:00', 16.2, 16.6, 16.1, 16.2, 329831),
('2019-03-15 00:00:00', 16.5, 16.5, 16.15, 16.3, 179184),
('2019-03-18 00:00:00', 16.3, 16.55, 16.3, 16.4, 192576),
('2019-03-19 00:00:00', 16.4, 16.45, 15.95, 16, 265514),
('2019-03-20 00:00:00', 16, 16.05, 15.85, 15.95, 190211),
('2019-03-21 00:00:00', 16.1, 16.5, 16, 16.1, 392846),
('2019-03-22 00:00:00', 16.2, 16.4, 16, 16.3, 273741),
('2019-03-25 00:00:00', 16.1, 16.15, 15.95, 16.05, 159210),
('2019-03-26 00:00:00', 16.15, 16.25, 16, 16.15, 141142),
('2019-03-27 00:00:00', 16.25, 16.45, 16.25, 16.3, 273841),
('2019-03-28 00:00:00', 16.3, 16.95, 16.25, 16.8, 454702),
('2019-03-29 00:00:00', 17, 17.15, 16.75, 16.85, 269488),
('2019-04-01 00:00:00', 17, 17.45, 17, 17.3, 515251),
('2019-04-02 00:00:00', 17.3, 17.45, 17.1, 17.2, 368050),
('2019-04-03 00:00:00', 17.15, 17.4, 17, 17.4, 286009),
('2019-04-04 00:00:00', 17.4, 17.6, 17.25, 17.35, 313524),
('2019-04-05 00:00:00', 17.35, 17.8, 17.35, 17.7, 440633),
('2019-04-08 00:00:00', 17.75, 18.9, 17.55, 18.9, 959718),
('2019-04-09 00:00:00', 19.2, 19.35, 18.4, 18.5, 795287),
('2019-04-10 00:00:00', 18.3, 19, 18.25, 18.5, 773993),
('2019-04-11 00:00:00', 18.45, 18.9, 18.3, 18.9, 798706),
('2019-04-12 00:00:00', 18.95, 19.4, 18.8, 19.35, 610246),
('2019-04-17 00:00:00', 19.4, 19.4, 18, 18, 914921),
('2019-04-18 00:00:00', 18, 18.2, 17.3, 17.8, 683922),
('2019-04-19 00:00:00', 17.85, 18.2, 17.8, 18.05, 389183),
('2019-04-22 00:00:00', 18.05, 18.05, 17.4, 17.4, 362605),
('2019-04-23 00:00:00', 17.45, 17.75, 17.4, 17.6, 288352),
('2019-04-24 00:00:00', 17.6, 18.15, 17.55, 18.1, 405355),
('2019-04-25 00:00:00', 18.05, 18.15, 17.85, 17.9, 211776),
('2019-04-26 00:00:00', 17.9, 18.5, 17.85, 18.5, 464419),
('2019-05-02 00:00:00', 18.5, 18.7, 18.1, 18.2, 322712),
('2019-05-03 00:00:00', 18.15, 18.2, 17.6, 17.75, 566721),
('2019-05-06 00:00:00', 17.4, 17.4, 17.05, 17.1, 401692),
('2019-05-07 00:00:00', 17.3, 17.6, 17.3, 17.45, 293564),
('2019-05-08 00:00:00', 17.1, 17.35, 17, 17.3, 197025),
('2019-05-09 00:00:00', 17.3, 17.4, 16.8, 16.9, 242355),
('2019-05-10 00:00:00', 17.1, 17.25, 16.75, 17.2, 423815),
('2019-05-13 00:00:00', 17.2, 17.35, 17.1, 17.2, 211466),
('2019-05-14 00:00:00', 17.05, 17.5, 16.9, 17.45, 297887),
('2019-05-16 00:00:00', 17.65, 17.85, 17.45, 17.45, 203453),
('2019-05-17 00:00:00', 17.45, 17.8, 17.4, 17.55, 234719),
('2019-05-20 00:00:00', 17.6, 17.85, 17.55, 17.7, 314302),
('2019-05-21 00:00:00', 17.75, 17.95, 17.55, 17.55, 281027),
('2019-05-22 00:00:00', 17.6, 17.7, 17.3, 17.3, 286618),
('2019-05-23 00:00:00', 17.25, 17.7, 17.15, 17.7, 388045),
('2019-05-24 00:00:00', 17.65, 17.8, 17.4, 17.4, 247357),
('2019-05-27 00:00:00', 17.45, 17.75, 17.45, 17.6, 190154),
('2019-05-28 00:00:00', 17.7, 17.85, 17.55, 17.7, 251150),
('2019-05-29 00:00:00', 17.75, 18.35, 17.7, 18.35, 673600),
('2019-05-30 00:00:00', 18.3, 18.5, 18.15, 18.15, 286033),
('2019-05-31 00:00:00', 18.15, 18.3, 17.75, 17.75, 331731),
('2019-06-03 00:00:00', 17.45, 17.65, 17.3, 17.3, 403855),
('2019-06-04 00:00:00', 17.4, 17.55, 17.25, 17.35, 233368),
('2019-06-05 00:00:00', 17.5, 17.65, 17.4, 17.4, 196609),
('2019-06-06 00:00:00', 17.4, 17.55, 17.15, 17.3, 190279),
('2019-06-07 00:00:00', 17.4, 17.8, 17.4, 17.75, 233491),
('2019-06-10 00:00:00', 17.9, 18.2, 17.9, 17.95, 306077),
('2019-06-11 00:00:00', 18, 18.2, 17.8, 17.8, 321589),
('2019-06-12 00:00:00', 17.8, 17.9, 17.55, 17.55, 205264),
('2019-06-13 00:00:00', 17.55, 18, 17.5, 17.85, 299504),
('2019-06-14 00:00:00', 18, 18.45, 18, 18.1, 539819),
('2019-06-17 00:00:00', 18.1, 18.25, 18, 18.05, 175554),
('2019-06-18 00:00:00', 18.1, 18.7, 18, 18.6, 536584),
('2019-06-19 00:00:00', 18.75, 18.95, 18.3, 18.35, 328453),
('2019-06-20 00:00:00', 18.75, 18.95, 18.3, 18.35, 328453),
('2019-06-24 00:00:00', 18.4, 18.7, 18.35, 18.4, 246263),
('2019-06-25 00:00:00', 18.4, 18.5, 18.3, 18.35, 194669),
('2019-06-26 00:00:00', 18.35, 18.5, 18.3, 18.35, 184299),
('2019-06-27 00:00:00', 18.4, 18.45, 18, 18, 275190),
('2019-06-28 00:00:00', 18, 18.4, 17.9, 18.35, 291832),
('2019-07-01 00:00:00', 18.55, 18.9, 18.5, 18.75, 397453),
('2019-07-02 00:00:00', 18.8, 18.8, 18.55, 18.6, 199126),
('2019-07-03 00:00:00', 18.6, 18.85, 18.5, 18.65, 290892),
('2019-07-04 00:00:00', 18.7, 18.85, 18.6, 18.65, 224919),
('2019-07-05 00:00:00', 18.65, 19.15, 18.6, 19.05, 576984),
('2019-07-08 00:00:00', 19.05, 19.3, 18.95, 19.15, 439639),
('2019-07-09 00:00:00', 19.15, 19.4, 19.1, 19.25, 462334),
('2019-07-10 00:00:00', 19.25, 19.35, 18.9, 18.9, 606913),
('2019-07-11 00:00:00', 19, 19, 18.6, 18.7, 473321),
('2019-07-12 00:00:00', 18.85, 19.05, 18.75, 18.8, 340943),
('2019-07-15 00:00:00', 18.8, 19, 18.75, 18.85, 218607),
('2019-07-16 00:00:00', 18.85, 19.15, 18.85, 18.85, 289205),
('2019-07-17 00:00:00', 18.85, 19.05, 18.5, 18.5, 557005),
('2019-07-18 00:00:00', 18.55, 18.75, 18.45, 18.6, 342767),
('2019-07-19 00:00:00', 18.6, 18.85, 18.6, 18.8, 310916),
('2019-07-22 00:00:00', 18.85, 18.9, 18.6, 18.6, 345799),
('2019-07-23 00:00:00', 18.6, 18.85, 18.5, 18.7, 408579),
('2019-07-24 00:00:00', 18.8, 18.85, 18.65, 18.7, 193715),
('2019-07-25 00:00:00', 18.7, 19, 18.7, 18.95, 407483),
('2019-07-29 00:00:00', 18.7, 18.75, 18.25, 18.35, 345894),
('2019-07-30 00:00:00', 18.45, 18.65, 18.25, 18.25, 597384),
('2019-07-31 00:00:00', 18.3, 18.35, 17.75, 17.9, 494280),
('2019-08-01 00:00:00', 17.9, 18.15, 17.7, 17.95, 317771),
('2019-08-02 00:00:00', 17.9, 18.05, 17.75, 17.85, 341050),
('2019-08-05 00:00:00', 17.85, 17.9, 17.5, 17.55, 394933),
('2019-08-06 00:00:00', 17.4, 17.6, 17.1, 17.4, 477527),
('2019-08-07 00:00:00', 17.45, 17.65, 17.45, 17.45, 239590),
('2019-08-08 00:00:00', 17.5, 17.65, 17.25, 17.5, 248283),
('2019-08-09 00:00:00', 17.5, 17.75, 17.5, 17.6, 185800),
('2019-08-12 00:00:00', 17.6, 17.7, 17.35, 17.4, 151342),
('2019-08-13 00:00:00', 17.35, 17.5, 17.3, 17.4, 171808),
('2019-08-14 00:00:00', 17.1, 17.4, 17.1, 17.2, 161062),
('2019-08-15 00:00:00', 16.8, 17.2, 16.8, 17.2, 152085),
('2019-08-16 00:00:00', 17.2, 17.3, 17.05, 17.05, 132932),
('2019-08-19 00:00:00', 17.05, 17.3, 16.95, 16.95, 97732),
('2019-08-20 00:00:00', 16.95, 17.15, 16.85, 16.85, 150448),
('2019-08-21 00:00:00', 16.85, 17.05, 16.7, 16.9, 240838),
('2019-08-22 00:00:00', 16.95, 17.1, 16.9, 16.9, 118117),
('2019-08-23 00:00:00', 16.9, 17.05, 16.8, 16.95, 90436),
('2019-08-26 00:00:00', 16.85, 16.9, 16.3, 16.5, 246642),
('2019-08-27 00:00:00', 16.55, 16.65, 16.2, 16.25, 240169),
('2019-08-28 00:00:00', 16.25, 16.4, 16.05, 16.05, 170181),
('2019-08-29 00:00:00', 16.05, 16.15, 15.8, 15.8, 205139),
('2019-08-30 00:00:00', 15.9, 16.4, 15.9, 16.4, 273371),
('2019-09-03 00:00:00', 16.4, 16.45, 15.9, 15.95, 120550),
('2019-09-04 00:00:00', 15.95, 16, 15.75, 15.9, 149041),
('2019-09-05 00:00:00', 16, 16.2, 15.95, 16, 158536),
('2019-09-06 00:00:00', 16.05, 16.2, 15.9, 15.95, 99509),
('2019-09-09 00:00:00', 16, 16.1, 15.95, 15.95, 104464),
('2019-09-10 00:00:00', 15.95, 16.2, 15.9, 15.95, 206782),
('2019-09-11 00:00:00', 16, 16.1, 15.85, 16, 106485),
('2019-09-12 00:00:00', 16.05, 16.4, 16.05, 16.35, 190836),
('2019-09-13 00:00:00', 16.35, 16.45, 16.25, 16.35, 178480),
('2019-09-16 00:00:00', 16.35, 16.35, 15.9, 15.95, 229298),
('2019-09-17 00:00:00', 15.9, 16.15, 15.85, 16, 179220),
('2019-09-18 00:00:00', 16.05, 16.2, 15.95, 15.95, 119584),
('2019-09-19 00:00:00', 16, 16.05, 15.9, 16, 105790),
('2019-09-20 00:00:00', 16, 16.2, 16, 16, 161224),
('2019-09-23 00:00:00', 16, 16.1, 15.95, 15.95, 114102),
('2019-09-24 00:00:00', 15.9, 16, 15.8, 15.8, 94341),
('2019-09-25 00:00:00', 15.85, 15.95, 15.7, 15.7, 171973),
('2019-09-26 00:00:00', 15.75, 15.85, 15.55, 15.65, 173800),
('2019-09-27 00:00:00', 15.55, 15.6, 15, 15.15, 358924),
('2019-09-30 00:00:00', 15.15, 15.5, 15.15, 15.35, 238662),
('2019-10-01 00:00:00', 15.35, 15.45, 15.1, 15.25, 158046),
('2019-10-02 00:00:00', 15.3, 15.45, 15, 15.15, 222555),
('2019-10-03 00:00:00', 15.1, 15.25, 14.95, 15.1, 190400),
('2019-10-04 00:00:00', 15.1, 15.3, 15.05, 15.2, 142369),
('2019-10-07 00:00:00', 15.2, 15.3, 14.95, 14.95, 138105),
('2019-10-08 00:00:00', 15, 15.1, 14.75, 14.8, 155560),
('2019-10-09 00:00:00', 14.85, 14.9, 14.75, 14.8, 129026),
('2019-10-10 00:00:00', 14.85, 15, 14.8, 14.9, 127147),
('2019-10-11 00:00:00', 14.9, 15.05, 14.9, 14.95, 136369),
('2019-10-14 00:00:00', 15.05, 15.25, 15.05, 15.2, 208580);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `stock_name`
--

CREATE TABLE `stock_name` (
  `stock_id` int(11) NOT NULL,
  `stockname` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=DYNAMIC;

--
-- Đang đổ dữ liệu cho bảng `stock_name`
--

INSERT INTO `stock_name` (`stock_id`, `stockname`, `company`, `note`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'AAA', 'Điện xanh', '1', '2021-11-17 15:53:06', '2021-11-17 15:53:06', 2, 2, 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `stock_sale`
--

CREATE TABLE `stock_sale` (
  `stock_sale_id` int(11) NOT NULL,
  `stock_id` int(11) NOT NULL,
  `customer_buy` int(11) NOT NULL,
  `number` int(11) NOT NULL,
  `cost` int(11) NOT NULL,
  `user_approved_id` int(11) NOT NULL,
  `note` varchar(1024) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=DYNAMIC;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `users_id` int(20) UNSIGNED NOT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fullname` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `permission_id` int(10) UNSIGNED DEFAULT NULL,
  `address` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `note` varchar(100) CHARACTER SET utf32 COLLATE utf32_vietnamese_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `id_created` int(11) NOT NULL,
  `id_updated` int(11) NOT NULL,
  `deleteflag` int(11) NOT NULL,
  `oldid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=DYNAMIC;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`users_id`, `username`, `email`, `password`, `phone`, `avatar`, `fullname`, `permission_id`, `address`, `note`, `created_at`, `updated_at`, `id_created`, `id_updated`, `deleteflag`, `oldid`) VALUES
(1, 'cuong', 'cuong@gmail.com', '$2b$12$60EHiBeAiyLcu8CatwHxe.x/RuG6dzFlb7csxPLLnA7vyNFIADypu', '123456789', 'https://1.bp.blogspot.com/-n_bFzL9lPUU/Xp23H9Sk8yI/AAAAAAAAhyA/JYfvZhwguxc8vT_YS3w14Xi3YWf3hxqIQCLcBGAsYHQ/s1600/Hinh-Anh-Dep-Tren-Mang%2B%25282%2529.jpg', '123456789', 1, '1', '1', '2021-06-22 17:00:00', '2021-06-15 17:00:00', 1, 1, 0, 1),
(5, 'sample', 'luvancuog0105@gmail.com', '$2b$12$60EHiBeAiyLcu8CatwHxe.x/RuG6dzFlb7csxPLLnA7vyNFIADypu', '0389992137', NULL, 'Lu van', 2, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'sss', '2021-08-18 01:04:26', '2021-08-21 06:43:27', 1, 1, 1, 0),
(6, 'lê minh mạng', 'luvancuong0105@gmail.com', '$2b$12$TuyWReRM4HRSSX6reTki1Oa6qAXnYO0wkliU0KAeDP32lApXBmeki', '0389992137', NULL, 'Lu van', 3, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'a', '2021-08-19 14:43:25', '2021-08-19 14:43:40', 1, 1, 1, 0),
(7, 'ahghghgh', 'luvancuong0105@gmail.com', '$2b$12$w1lC25RcDH/DldxGgHHemOg67BLXL4Aly67IZyq/jk0NDcjx475r.', '0389992137', NULL, 'Lu van', 2, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'hghh', '2021-08-19 14:45:28', '2021-08-19 18:12:52', 1, 1, 1, 0),
(8, 'đâsdsadasd', 'luvancuong0105@gmail.com', '$2b$12$JaC03LrYBl8kW/jg7tl6P.2WdVObapyH5PvIGJJbHUYKGy6nraX06', '0389992137', NULL, 'Lư Cương', 1, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'sdadsad', '2021-08-19 14:45:50', '2021-08-21 06:43:24', 1, 1, 1, 0),
(9, 'âsasas', 'luvancuong0105@gmail.com', '$2b$12$XZav14jJ3Wm7v1/JZ4d6EOnaZ9rYj/CtZkmi0oiM8ybSyIOCIKL1C', '0389992137', NULL, 'Lu van', 1, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'aaa', '2021-08-19 14:48:14', '2021-08-19 19:14:15', 1, 1, 1, 0),
(10, 'cxcxcxccx', 'luvancuong0105@gmail.com', '$2b$12$OoXKmXcTAoBI6rDQiDLc1eQTZrWX.L6ORWCmzMnm6.0izwxedWEnW', '0389992137', NULL, 'Lu van', 1, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'c', '2021-08-19 14:56:25', '2021-08-19 19:14:09', 1, 1, 1, 0),
(11, 'kế toán', 'levan2@gmail.com', '$2b$12$jLVNOZ.zBHvqLhpqS.V9r.WLcLMVNj0Geh4GXMyeh1.5YsT.ueCMi', '0983838232', NULL, 'sadasd', 4, 'ádasd', 'sdsd', '2021-08-19 19:54:10', '2021-08-21 06:43:21', 1, 1, 1, 0),
(12, 'cộng tác viên', 'lelan2a@gmail.com', '$2b$12$75vpmZq3zCEpi6YoFYQxp.KcEbbCJU3epCUrHOvktxxIz2sn5jn.a', '0399943233', NULL, 'Lu van', 10, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'c', '2021-08-19 20:02:25', '2021-08-21 06:43:18', 1, 1, 1, 0),
(13, 'cuong1', 'luvancuong0105@gmail.com', '$2b$12$ikt/VxDiSphFb4uj9IBkMetzZUHwz98Wq3zMxHHa3irFwsOI7eQ.S', '0389992137', 'https://imgt.taimienphi.vn/cf/images/li/2017/9/26/hinh-anh-vui-hai-huoc.jpg', 'Lu van', 2, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'a', '2021-08-21 06:44:22', '2021-08-21 06:44:22', 1, 1, 0, 0),
(14, 'levan cuong', 'luvan1@gmail.com', '$2b$12$60EHiBeAiyLcu8CatwHxe.x/RuG6dzFlb7csxPLLnA7vyNFIADypu', '0988891234', 'https://i.pinimg.com/236x/be/81/a2/be81a2314054d5effd7ea90e8375fbfe.jpg', 'anhban', 2, 'asdasd', 'a', '2021-08-21 07:35:36', '2021-08-21 07:35:36', 1, 1, 0, 0),
(15, 'quản trị nhóm', 'troly2@gmail.com', '$2b$12$ikt/VxDiSphFb4uj9IBkMetzZUHwz98Wq3zMxHHa3irFwsOI7eQ.S', '0923456789', 'https://yeualo.com/wp-content/uploads/www_yeualo_com-Hinh-mat-cuoi-ngo-nghinh-vui-nhon-dep-nhat-1.jpg', 'troy 2', 3, '1', '1', '2021-08-21 07:38:43', '2021-08-21 07:38:43', 1, 1, 0, 0),
(16, 'troly3', 'troly3@gmail.com', '$2b$12$d6GD1t3rvZ0bYq.LG2mwLuUP5a6Sqe2we3Lk45VQhru1Wm4EkzOP2', '0812345671', 'https://cdn.chanhtuoi.com/uploads/2020/05/w400/icon-facebook-34-1.jpg.webp', 'tro ly 3', 3, 'ádasd', '1', '2021-08-21 07:45:48', '2021-08-21 07:45:48', 1, 1, 0, 0),
(17, 'ké toán 1', 'ketoan1@gmail.com', '$2b$12$M7yCipCfqdgYCAZVBCfE2u1GYaehoWSq69a7DI3LfiZulr3Hzn7sW', '0912345678', 'http://www.xaluan.com/images/news/Image/2015/09/27/85607b12df0483.img.jpg', 'ketoan1', 4, '1', '1', '2021-08-21 07:47:03', '2021-08-21 07:47:03', 1, 1, 0, 0),
(18, 'cong tac vien', 'congtacvien1@gmail.com', '$2b$12$M7yCipCfqdgYCAZVBCfE2u1GYaehoWSq69a7DI3LfiZulr3Hzn7sW', '0987654321', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_S3RJeBiVfAvylVIIehTqRrG-ghuiX0kHJw&usqp=CAU', 'sssd', 10, 'sâs', 'sâs', '2021-08-21 08:28:40', '2021-08-21 08:28:40', 1, 1, 0, 0),
(19, 'user name', 'ghidanh@gmail.com', '$2b$12$q3zB3/sTYsO.KtHUqBbNWOxs05lVbeQckT4PEyPkevUSjKVCSVCDy', '0987654321', 'https://znews-photo-fbcrawler.zadn.vn/Uploaded/spcwvovd/2016_09_14/Xinchao_10fps.gif.jpg', 'acesss', 11, 'a', 'a', '2021-08-21 08:29:28', '2021-08-21 08:29:28', 1, 1, 0, 0),
(20, 'vidu1a', 'luvancusong0105@gmail.com', '$2b$12$ipHPbNh1kYt71.SmHDEQUeNQi2FIv3fRbVGuT2YPQaoIaeP5.PL9a', '0389992137', NULL, 'Lu van', 3, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'ư', '2021-08-22 07:04:08', '2021-08-22 07:27:04', 0, 13, 1, 0),
(21, 'vidu1', 'luvancusong0105@gmail.com', '$2b$12$9hvsgRrZaqdlqZnMkU1In.b04CO5Sqk5aUmqhFLIPd0qp0y5QPaby', '0389992137', NULL, 'Lu van', 3, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'ư', '2021-08-22 04:09:45', '2021-08-22 06:43:42', 13, 13, 1, 20),
(22, 'vidu1', 'luvancusong0105@gmail.com', '$2b$12$9hvsgRrZaqdlqZnMkU1In.b04CO5Sqk5aUmqhFLIPd0qp0y5QPaby', '0389992137', NULL, 'Lu van', 3, 'so 15 ngõ Lê trọng tấn Thanh xuân hà nội', 'ư', '2021-08-22 04:09:45', '2021-08-22 07:04:07', 13, 13, 1, 20);

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `address`
--
ALTER TABLE `address`
  ADD PRIMARY KEY (`addr_id`);

--
-- Chỉ mục cho bảng `advertisement_content`
--
ALTER TABLE `advertisement_content`
  ADD PRIMARY KEY (`advertisement_id`);

--
-- Chỉ mục cho bảng `company`
--
ALTER TABLE `company`
  ADD PRIMARY KEY (`company_id`);

--
-- Chỉ mục cho bảng `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`customer_id`);

--
-- Chỉ mục cho bảng `decentralization_access`
--
ALTER TABLE `decentralization_access`
  ADD PRIMARY KEY (`decentralization_access_id`);

--
-- Chỉ mục cho bảng `detailbank`
--
ALTER TABLE `detailbank`
  ADD PRIMARY KEY (`bank_id`);

--
-- Chỉ mục cho bảng `enterprise`
--
ALTER TABLE `enterprise`
  ADD PRIMARY KEY (`enterprise_id`);

--
-- Chỉ mục cho bảng `group_content`
--
ALTER TABLE `group_content`
  ADD PRIMARY KEY (`group_content_id`);

--
-- Chỉ mục cho bảng `group_content_sub`
--
ALTER TABLE `group_content_sub`
  ADD PRIMARY KEY (`group_content_sub_id`);

--
-- Chỉ mục cho bảng `group_customer_content`
--
ALTER TABLE `group_customer_content`
  ADD PRIMARY KEY (`group_customer_id`);

--
-- Chỉ mục cho bảng `gro_pages_content`
--
ALTER TABLE `gro_pages_content`
  ADD PRIMARY KEY (`pages_content_id`);

--
-- Chỉ mục cho bảng `gro_pages_customer_content`
--
ALTER TABLE `gro_pages_customer_content`
  ADD PRIMARY KEY (`pages_customer_content_id`);

--
-- Chỉ mục cho bảng `mqtt_microservice`
--
ALTER TABLE `mqtt_microservice`
  ADD PRIMARY KEY (`mqtt_microservice_id`);

--
-- Chỉ mục cho bảng `mqtt_user`
--
ALTER TABLE `mqtt_user`
  ADD PRIMARY KEY (`mqtt_user_id`);

--
-- Chỉ mục cho bảng `oauthen2`
--
ALTER TABLE `oauthen2`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `oauthen2customer`
--
ALTER TABLE `oauthen2customer`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `permission`
--
ALTER TABLE `permission`
  ADD PRIMARY KEY (`permission_id`);

--
-- Chỉ mục cho bảng `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`product_id`);

--
-- Chỉ mục cho bảng `product_back`
--
ALTER TABLE `product_back`
  ADD PRIMARY KEY (`buyproduct_id`);

--
-- Chỉ mục cho bảng `product_buy`
--
ALTER TABLE `product_buy`
  ADD PRIMARY KEY (`buyproduct_id`);

--
-- Chỉ mục cho bảng `product_buy_detail`
--
ALTER TABLE `product_buy_detail`
  ADD PRIMARY KEY (`id_buy_detail`);

--
-- Chỉ mục cho bảng `product_buy_return`
--
ALTER TABLE `product_buy_return`
  ADD PRIMARY KEY (`product_buy_return_id`);

--
-- Chỉ mục cho bảng `product_group`
--
ALTER TABLE `product_group`
  ADD PRIMARY KEY (`product_group_id`);

--
-- Chỉ mục cho bảng `product_image`
--
ALTER TABLE `product_image`
  ADD PRIMARY KEY (`image_id`);

--
-- Chỉ mục cho bảng `product_lost`
--
ALTER TABLE `product_lost`
  ADD PRIMARY KEY (`stord_id`);

--
-- Chỉ mục cho bảng `product_pages`
--
ALTER TABLE `product_pages`
  ADD PRIMARY KEY (`product_pages_id`);

--
-- Chỉ mục cho bảng `product_store`
--
ALTER TABLE `product_store`
  ADD PRIMARY KEY (`store_product_id`);

--
-- Chỉ mục cho bảng `return_service`
--
ALTER TABLE `return_service`
  ADD PRIMARY KEY (`bill_service_id`);

--
-- Chỉ mục cho bảng `service`
--
ALTER TABLE `service`
  ADD PRIMARY KEY (`service_id`);

--
-- Chỉ mục cho bảng `service_bill`
--
ALTER TABLE `service_bill`
  ADD PRIMARY KEY (`bill_service_id`);

--
-- Chỉ mục cho bảng `service_charging`
--
ALTER TABLE `service_charging`
  ADD PRIMARY KEY (`bill_service_id`);

--
-- Chỉ mục cho bảng `service_group`
--
ALTER TABLE `service_group`
  ADD PRIMARY KEY (`service_group_id`);

--
-- Chỉ mục cho bảng `service_pages`
--
ALTER TABLE `service_pages`
  ADD PRIMARY KEY (`service_pages_id`);

--
-- Chỉ mục cho bảng `social_shop`
--
ALTER TABLE `social_shop`
  ADD PRIMARY KEY (`social_shop_id`);

--
-- Chỉ mục cho bảng `stock_buy`
--
ALTER TABLE `stock_buy`
  ADD PRIMARY KEY (`stock_buy_id`);

--
-- Chỉ mục cho bảng `stock_name`
--
ALTER TABLE `stock_name`
  ADD PRIMARY KEY (`stock_id`);

--
-- Chỉ mục cho bảng `stock_sale`
--
ALTER TABLE `stock_sale`
  ADD PRIMARY KEY (`stock_sale_id`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`users_id`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `address`
--
ALTER TABLE `address`
  MODIFY `addr_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `advertisement_content`
--
ALTER TABLE `advertisement_content`
  MODIFY `advertisement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `company`
--
ALTER TABLE `company`
  MODIFY `company_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `customer`
--
ALTER TABLE `customer`
  MODIFY `customer_id` int(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT cho bảng `decentralization_access`
--
ALTER TABLE `decentralization_access`
  MODIFY `decentralization_access_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `detailbank`
--
ALTER TABLE `detailbank`
  MODIFY `bank_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `enterprise`
--
ALTER TABLE `enterprise`
  MODIFY `enterprise_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `group_content`
--
ALTER TABLE `group_content`
  MODIFY `group_content_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `group_content_sub`
--
ALTER TABLE `group_content_sub`
  MODIFY `group_content_sub_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT cho bảng `group_customer_content`
--
ALTER TABLE `group_customer_content`
  MODIFY `group_customer_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `gro_pages_content`
--
ALTER TABLE `gro_pages_content`
  MODIFY `pages_content_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=561;

--
-- AUTO_INCREMENT cho bảng `gro_pages_customer_content`
--
ALTER TABLE `gro_pages_customer_content`
  MODIFY `pages_customer_content_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `mqtt_microservice`
--
ALTER TABLE `mqtt_microservice`
  MODIFY `mqtt_microservice_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT cho bảng `mqtt_user`
--
ALTER TABLE `mqtt_user`
  MODIFY `mqtt_user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `oauthen2`
--
ALTER TABLE `oauthen2`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT cho bảng `oauthen2customer`
--
ALTER TABLE `oauthen2customer`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT cho bảng `permission`
--
ALTER TABLE `permission`
  MODIFY `permission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT cho bảng `product`
--
ALTER TABLE `product`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT cho bảng `product_back`
--
ALTER TABLE `product_back`
  MODIFY `buyproduct_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `product_buy`
--
ALTER TABLE `product_buy`
  MODIFY `buyproduct_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT cho bảng `product_buy_detail`
--
ALTER TABLE `product_buy_detail`
  MODIFY `id_buy_detail` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT cho bảng `product_group`
--
ALTER TABLE `product_group`
  MODIFY `product_group_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `product_image`
--
ALTER TABLE `product_image`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT cho bảng `product_lost`
--
ALTER TABLE `product_lost`
  MODIFY `stord_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `product_pages`
--
ALTER TABLE `product_pages`
  MODIFY `product_pages_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT cho bảng `product_store`
--
ALTER TABLE `product_store`
  MODIFY `store_product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT cho bảng `return_service`
--
ALTER TABLE `return_service`
  MODIFY `bill_service_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `service`
--
ALTER TABLE `service`
  MODIFY `service_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT cho bảng `service_bill`
--
ALTER TABLE `service_bill`
  MODIFY `bill_service_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `service_charging`
--
ALTER TABLE `service_charging`
  MODIFY `bill_service_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `service_group`
--
ALTER TABLE `service_group`
  MODIFY `service_group_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT cho bảng `service_pages`
--
ALTER TABLE `service_pages`
  MODIFY `service_pages_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT cho bảng `social_shop`
--
ALTER TABLE `social_shop`
  MODIFY `social_shop_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `stock_buy`
--
ALTER TABLE `stock_buy`
  MODIFY `stock_buy_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `stock_name`
--
ALTER TABLE `stock_name`
  MODIFY `stock_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `stock_sale`
--
ALTER TABLE `stock_sale`
  MODIFY `stock_sale_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `users_id` int(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
