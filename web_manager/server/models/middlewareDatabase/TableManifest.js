const TableManifest={
    MASTER:1, // Quản trị cấp cao toan quyền sửa
    MANAGER:2, // quản trị Trang, toàn quyền thêm sửa xóa trang web nhưng không thể  xóa liên quan nghiệp vụ kinh doanh
    SUPPORT:3, //  kế toán, chỉ có thể xem và sửa liên quan nghieep vụ kinh doanh
    ACCOUNT:4, //  kế toán, chỉ có thể xem và sửa liên quan nghieep vụ kinh doanh
    ADMIN:10, // Quản trị trang có thể thêm sửa  trang web
    NEW_REGISTER:11, //Ghi danh
  };

  module.exports =TableManifest;
