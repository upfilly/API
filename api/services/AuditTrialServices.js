exports.isFunction = (x) => {
    return Object.prototype.toString.call(x) === '[object Function]';
};
exports.isArray = (x) => {
    return Object.prototype.toString.call(x) === '[object Array]';
};
exports.isDate = (x) => {
    return Object.prototype.toString.call(x) === '[object Date]';
};
exports.isObject = (x) => {
    return Object.prototype.toString.call(x) === '[object Object]';
};
exports.isValue = (x) => {
    return !this.isObject(x) && !this.isArray(x);
};
exports.compare_array_of_strings = (array1, array2) => {
    return (array1.length == array2.length) && array1.every((item) => {
        return array2.includes(item)
    });
};
exports.compare_objects = (newObj, oldObj) => {

    // console.log(newObj, '====newObj');
    // console.log(oldObj, '====oldObj');

    delete newObj.createdAt;
    delete newObj.updatedAt;
    delete newObj.location;
    delete oldObj.createdAt;
    delete oldObj.updatedAt;
    delete oldObj.location;


    if (Object.keys(oldObj).length == 0 && Object.keys(newObj).length > 0) {
        return newObj;
    }

    let diff = {};
    for (const key in newObj) {
        if (this.isValue(newObj[key]) && this.isValue(newObj[key]) && oldObj[key] != newObj[key]) {
            diff[key] = newObj[key];
            // console.log( diff[key], '======',  newObj[key]);
        }

        if (this.isArray(newObj[key]) && this.isArray(oldObj[key])) {
            is_same = this.compare_array_of_strings(newObj[key], oldObj[key]);
            if (!is_same) {
                diff[key] = newObj[key];
            }
        }

        if (this.isObject(newObj[key])) {
            diff[key] = this.compare_objects(newObj[key], oldObj[key])
        }
    }

    if (Object.keys(diff).length > 0) {
        return diff;
    }

    return false;
};

exports.create_audit_trial = async (user_id, module, type, newObj, oldObj) => {
    // console.log("----in audit");
    let get_changes = await this.compare_objects(newObj, oldObj);
    if(Object.keys(get_changes).length > 0){
        let add_audit_trial = await AuditTrials.create({
            user_id : user_id,
            module : module,
            type : type,
            data : get_changes,
            old_data: oldObj,
            changed_id : newObj.id
        }); 
        // console.log(add_audit_trial,"-----------add_audit_trial");
    }
}