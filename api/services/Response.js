/**
 * Responses For Success And Failed
 */

// Sending Success Response
exports.success = (data, message, req, res) => {
    if (!data) {
        data = {}
    }

    if (!message) {
        message = ""
    }

    let statusCode = 200;
    let success = true;

    return res.status(statusCode).json({
        success: success,
        code: statusCode,
        message: message,
        data: data
    })
}

// Sending Failed Response
exports.failed = (data, message, req, res) => {
    if (!data) {
        data = {}
    }

    if (!message) {
        message = ""
    }

    let statusCode = 400;
    let success = false;

    return res.status(statusCode).json({
        success: false,
        error: {
            code: statusCode,
            message: message,
            data: data
        }
    })
}