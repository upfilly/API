module.exports = {
    schema: true,
    attributes: {
        type: { type: 'string', isIn: ["user"], required: true },
        user_id: { model: 'users' },
        fav_user_id: { model: 'users' },
        isFavourite: { type: 'Boolean', defaultsTo: true },
        time_clicked: { type: 'number', defaultsTo: 1 },
        last_date_saved: { type: 'ref', columnType: 'datetime' },
        last_date_removed: { type: 'ref', columnType: 'datetime' },
        createdAt: { type: 'ref', autoCreatedAt: true },
        updatedAt: { type: 'ref', autoUpdatedAt: true },
        updatedBy: { model: 'users' },
    }
};