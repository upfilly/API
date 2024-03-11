exports.set_all_permissions_true = async (permissions) => {
    permissions.affiliate_disabled = false;
    permissions.affiliate_read = true;
    permissions.affiliate_write = true;

    permissions.brand_disabled = false;
    permissions.brand_read = true;
    permissions.brand_write = true;

    permissions.is_admin_access = true;

    return permissions;
}

exports.set_permissions = async (permissions) => {
    if (permissions.affiliate_disabled) {
        permissions.affiliate_read = false;
        permissions.affiliate_write = false;
    } else if (permissions.affiliate_write) {
        permissions.affiliate_read = true;
        permissions.affiliate_disabled = false;
    }

    if (permissions.brand_disabled) {
        permissions.brand_read = false;
        permissions.brand_write = false;
    } else if (permissions.brand_write) {
        permissions.brand_read = true;
        permissions.brand_disabled = false;
    }


    return permissions;
}

exports.is_admin_access = async (user_id) => {
    let get_permissions = await Permissions.findOne({
        user_id: user_id
    });

    if (get_permissions && get_permissions.is_admin_access) return true;

    return false;
}