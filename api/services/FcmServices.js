const credentials = require('../../config/local');
const FCM = require('fcm-node');
const fcm = new FCM(credentials.FCM_KEY);
const axios = require('axios');

exports.send_fcm_push_notification = async (data) => {
    let payload = {
        to: data.device_token,                   // Send notication to connected device
        // data: { //some data object (optional)			
        //     value: data
        // },
        // priority: 'high',
        // content_available: true,
        notification: { //notification object
            title: data.title,
            body: data.message,
            // sound: "default",
            // badge: "1"
        }
    };
    const config = {
        headers: {
            "Authorization": `Bearer ${credentials.FCM_KEY}`,
            "Content-Type": "application/json",
        }

    };

    const url = `https://fcm.googleapis.com/fcm/send`;
    let { response } = axios.post(url,payload, config);
    console.log(response, '=======data2222222');

}
