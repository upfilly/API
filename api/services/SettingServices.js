exports.get_settings = async () => {
    let get_settings = await Settings.findOne({ isDeleted: false });
    return get_settings;
}

exports.get_value = async (key) => {
    let get_settings = await Settings.findOne({ where: { isDeleted: false }, select: [key] });
    return get_settings[key];
}