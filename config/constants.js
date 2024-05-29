module.exports.constants = {


    user: {
        //Registration and Login
        "USERNAME_REQUIRED": "Email is required",
        "FIRSTNAME_REQUIRED": "Firstname is required",
        "LASTNAME_REQUIRED": "Lastname is required",
        "PHONE_REQUIRED": "Phone number is required",
        "EMAIL_REQUIRED": "Email is required",
        "EMAIL_EXIST": "Email-Id already exists.",
        "WRONG_EMAIL": "Email-Id does not exists",
        "PASSWORD_REQUIRED": "Password is required",
        "UNVERIFIED": "You have not verified your account. Please verify",
        "USERNAME_NOT_APPROVED": "You have not approved by the admin",
        "SUCCESSFULLY_REGISTERED": "Successfully registered",
        "SUCCESSFULLY_LOGGEDIN": "Successfully logged in",
        "WRONG_USERNAME": "Username does not exists",
        "WRONG_PASSWORD": "Password is wrong!",
        "PAYLOAD_MISSING": "Required keys are missed in payload",
        "CURRENT_PASSWORD": "Current Password is wrong!",
        "INVALID_USER": "Invalid User. Your email does not exist to our system.",
        "ALREADY_VERIFIED": "You have already verified your email. Please login to website.",
        "ERROR_MAIL": "There is some error to send mail to your email id.",
        "LINK_MAIL": "Link for reset password has been sent to your email id.",
        "PASSWORD_CHANGED": "Password has been changed",
        "ROLE_REQUIRED": "Role is required.",
        "USERNAME_ALREADY": "Username is already exits.",
        "USERNAME_INACTIVE": "User is in active",
        "CONPASSWORD_REQUIRED": "Confirm Password is required",
        "CURRENTPASSWORD_REQUIRED": "Current Password is required",
        "CONFIRM_PASSWORD_NOTMATCH": "Confirm Password is not Match",
        "ID_REQUIRED": "id Is Required",
        "UPDATED_USER": "User updated successfully.",
        "USERNAME_VERIFIED": "User is not verified.",
        "INVALID_CRED": "Invalid login credentials.",
        "COMPANY_REQUIRED": " Company id required.",
        "DOMAIN_REQUIRED": "Domain key required.",
        "CONTACT_ADMIN": "Unable to login. Please contact admin.",
        "USER_DELETED": "User deleted successfully.",
        "VERIFICATION_SENT": "Verification code send successfully",
        INVALID_ID: "Invalid Id",
        INVALID_ROLE: "Invalid role",
        DIAL_CODE_REQUIRED: "Dial code required",
        MOBILE_NO_REQUIRED: "Mobile number required",
        MOBILE_NO_EXIST: "Mobile number already registered.",
        USER_NOT_FOUND: "User not found",
        INVALID_VERIFICATION_CODE: "Invalid verification code",
        INVALID_FILE_TYPE: "Invalid File type",
        FETCHED: "Details fetched successfully",
        INVALID_REFERRAL_CODE: "Invalid referral code",
        USERNAME_DEACTIVE: "Account is not active. Please contact to admin.",
        OPT_SENT: "Verification code sent successfully",
        CHECK_EMAIL: "Verify your email we’ve sent you.",
        USER_ADD: "User added successfully.",
        BRAND_NOT_EXISTS:"Brand not exists",
        ACTIVE_USER_CHANGED:"Active user status changes",
        INVITED_USER_DELETED:"Invited user deleted"
    },
    COMMON: {
        COUNTRY_CODE_REQUIRED: "Country  code is required",
        SUCCESS: "Success",
        INVALID_COUNTRY_CODE: "Invalid country code",
        SERVER_ERROR: "Something Went Wrong. Please try again.",
        UNAUTHORIZED: "You are not authorized to perform this operation",
        STATUS_CHANGED: "Status Change Successfully",
        NOT_VALID_FILE: "Invalid File Type",
        ID_REQUIRED: "Id required",
        INVALID_ID: "Invalid Id",
        UNSUPPORTED_API_VERSION: "You are using unsupported version of API",
        API_NOT_EXIST: "This API no longer exists",
        UNPROCESSABLE_DATA: "Unprocessable data"
    },
    features: {
        FEATURES_SAVED: "Features saved successfully.",
        ALREADY_EXIST: "This Features already exist",
        UPDATED_FEATURES: "Features updated successfully.",
        GET_DATA: "Feature fetch successfully.",
        ID_REQUIRED: "Features id required.",
        NO_RESULT: "No Features found.",
        INVALID_ID: "Invalid Id.",
        ALL_FEATURES: "All Features found successfully.",
        DELETED_FEATURES: "Features deleted successfully"
    },
    SUBSCRIPTION_PLAN: {
        NAME_REQUIRED: "Name is required",
        NAME_EXIST: "Same plan already exists",
        AMOUNT_REQUIRED: "Amount is required",
        UNABLE_TO_CREATE_PRODUCT: "Unable to create product",
        UNABLE_TO_CREATE_PLAN: "Unable to create plan",
        ADDED: "Subscription plan added successfully",
        UPDATED: "Subscription plan updated successfully",
        INVALID_ID: "Invalid id",
        FETCHED: "Subscription plan fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Subscription plan removed successfully",
        INVALID_USER: "Invalid user",
        BUY_SUBSCRIPTION: "Subscription plan purchased successfully",
        PAYMENT_FAILED: "Payment failed",
        SUBSCRIPTION_CANCELLED: "Subscription cancelled successfully",
        SUBSCRIPTION_NOT_FOUND: "Subscription not found",
        INVALID_CARD: "Invalid card",
        USER_ID_REQUIRED: "User_id is required",
        ACTIVE_SUBSCRIPTION_FETCHED: "Active subscription fetched successfully",
        NO_SUBSCRIPTION_FOUND: "No subscription found",
        INVALID_USER_ID: "Invalid user id",
        INVALID_SUBSCRIPTION_PLAN_ID: "Invalid subscription plan id",
        ALREADY_RECOMMEND: "Another plan already recommend.",
        CARD_EXPIRE: "Card has expire",
        INVALID_PLAN: "Invalid subscription plan"

    },
    CARD: {
        USER_ID_REQUIRED: "User ID is required",
        UNABLE_TO_CREATE_STRIPE_CUSTOMER: "Unable to create stripe customer",
        UNABLE_TO_CREATE_CUSTOMER_SOURCE: "Unable to create customer source",
        ADDED: "Card added successfully",
        FETCHED: "Card fetched successfully",
        ID_REQUIRED: "Id is required",
        CANT_DELETE_PRIMARY_CARD: "Can't delete primary card",
        DELETED: "Card removed successfully",
        INVALID_USER_ID: "Invalid User ID",
        CARD_ID_REQUIRED: "Card id required",
        INVALID_ID: "Invalid id",
        USER_NOT_FOUND: "User not found",
        UNAUTHORIZED: "User is not authorized",
        PRIMARY_SET: "Card set as primary card successfully",
        CARD_EXIST: 'Card already exist.',
    },
    PERMISSIONS: {
        FETCHED: "Permission Fetched Successfully",
        ID_REQUIRED: "Id Required",
        INVALID_ID: "Invalid id",
        UPDATED: "Permission Updated Successfully",
        ROLE_REQUIRED: "Role Required",
        USER_ID_REQUIRED: "User Id Required",
        INVALID_USER_ID: "Invalid User id",
    },
    COMMON_CATEGORIES: {
        ADDED: "Added successfully",
        UPDATED: "Updated successfully",
        INVALID_ID: "Invaild Id",
        FETCHED: "Fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Deleted successfully",
        FETCHED_ALL: "Fetched successfully",
        ALREADY_EXIST: "Same name already exists",
    },

    TRANSACTION: {
        INVALID_ID: "Invaild Id",
        FETCHED: "Transaction Fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Deleted successfully",
        FETCHED_ALL: "Transactions fetched successfully",
        SUCCESSFULLY: "Payment was successful!",
        TRANSACTION_ERROR: "Some error occurred while transaction.",
        ACCOUNT_NOT_CREATED: "Payment was unsuccessfull because user not added their bank on stripe.",
        BANK_ADDED: "Bank added successfully on stripe"

    },
    CONTRACT: {
        ADDED: "Contract added successfully",
        UPDATED: "Contract updated successfully",
        INVALID_ID: "Invaild Id",
        FETCHED: "Contract fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Contract deleted successfully",
        FETCHED_ALL: "Contract fetched successfully",
        ALREADY_EXIST: "Same name already exists",
        CANNOT_CHANGE_ACCEPTED: "Sorry, but you can't change status of completed contract",
        CANNOT_ACCEPT: "Sorry, but you can't accept completed contract",
        STATUS_UPDATE: "Status updated successfully",
        INVALID_INFLUENCER_ID: "Invaild influencer Id",
        USERS_FETCHED: "Users fetched successfully",
        GRAPH_DATA_FETCHED: "Graph data fetched successfully",

    },
    ASSIGNED_CONTRACT: {
        ADDED: "Contract sent successfully",
        INVALID_CONTRACT_ID: "Invaild contract Id",
        ALREAD_ASSIGNED: "Contract sent already",
        INVALID_INFLUENCER_ID: "Invaild influencer Id",
        FETCHED: "Contract fetched successfully",
        FETCHED_ALL: "Contract fetched successfully",
        INVALID_ID: "Invaild Id",
        ID_REQUIRED: "Id is required",
        CANNOT_CHANGE_ACCEPTED: "Sorry, but you can't change status of completed contract",
        CANNOT_ACCEPT: "Sorry, but you can't accept completed contract",
        STATUS_UPDATE: "Status updated successfully",
    },
    HIRING: {
        ADDED: "Influencer invited successfully",
        UPDATED: "Invite updated successfully",
        INVALID_ID: "Invaild Id",
        INVALID_INFLUENCER_ID: "Invaild influncer Id",
        FETCHED: "Invite fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Invite deleted successfully",
        FETCHED_ALL: "Invite fetched successfully",
        ALREADY_EXIST: "Influencer already invited",
        CANNOT_CANCEL: "Sorry but you can't change status of accepted or cancelled invites",
        CANNOT_ACCEPT: "Sorry but you can't accept cancelled invites",
        STATUS_UPDATE: "Invite status updated successfully",
        NEED_TO_UPGRADE: "You need to upgrade your plan to send more invites.",
    },
    FAVOURITE: {
        REMOVED: "Removed from favourite successfully",
        ADDED: "Added to favorites successfully",
        FETCHED: "Favorites fetched successfully",
        ID_REQUIRED: "id is required",
        INVALID_ID: "Invaild Id",
    },
    FAQ: {
        CREATED: "FAQ is added successfully",
        FETCHED: "FAQ fetched successfully",
        INVALID_ID: "Invalid id",
        FETCHED_ALL: "FAQ fetched sucessfully",
        UPDATED: "FAQ updated successfully",
        ALREADY_EXIST: "FAQ is already Exist",
        QUESTION_REQUIRED: "question is required",
        DELETED: "FAQ deleted successfully",
        ID_REQUIRED: "ID is Required"
    },
    PROFILE_CLAIM: {
        INVALID_USER_ID: "Invalid user id",
        ALREADY_CLAIMED: "This profile is already claimed",
        EMAIL_NOT_MATCHED: "Email address is not matched",
        VERIFICATION_CODE_SENT: "Verification code sent to registered profile email successfully",
        INVALID_CODE: "Invalid verification code",
        CLAIMED: "Profile claimed successfully",
        FETCHED: "Profile claim fetched successfully",
        INVALID_ID: "Invaild Id",
        FETCHED_ALL: "Profile claim fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Deleted successfully",
    },
    PROFILE_VIEWS: {
        REMOVED: "Removed from favourite successfully",
        ADDED: "Added to favorites successfully",
        FETCHED: "Profile views fetched successfully",
        ID_REQUIRED: "id is required",
        INVALID_ID: "Invaild Id",
        GRAPH_DATA_FETCHED: "Graph data fetched successfully",

    },
    LANGUAGE: {
        ADDED: "Language added successfully",
        FETCHED: "Language fetched successfully",
        INVALID_ID: "Invalid id",
        FETCHED_ALL: "Language fetched sucessfully",
        UPDATED: "Language updated successfully",
        ALREADY_EXIST: "Language is already Exist",
        QUESTION_REQUIRED: "question is required",
        DELETED: "Language deleted successfully",
        ID_REQUIRED: "ID is Required"
    },
    COMMON_DELETES: {
        DELETED: "Deleted successfully",
        INVALID_CONTRACT_ID: "Invalid contract id",
        CANT_DELETE_RUNNING_CONTRACT: "Sorry, but you can't delete running contracts",
        INVALID_CAMPAIGN_ID: "Invalid campaign id",
        CANT_DELETE_RUNNING_CAMPAIGN: "Sorry, but you can only delete pending campaign",
    },
    CAMPAIGN: {
        ADDED: "Campaign added successfully",
        UPDATED: "Campaign updated successfully",
        INVALID_ID: "Invaild Id",
        FETCHED: "Campaign fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Campaign deleted successfully",
        FETCHED_ALL: "Campaign fetched successfully",
        ALREADY_EXIST: "Same name already exists",
        INVALID_CONTRACT_ID: "Invalid contract Id",
        ALREADY_EXIST: "Campaign already started for this contract",
        CANNOT_ACCEPT: "This campaign already accepted",
        STATUS_UPDATE: "Status updated successfully",
        INVALID_INFLUENCER_ID: "Invaild influencer Id",
    },
    NOTIFICATION: {
        FETCHED: "Notification fetched successfully",
        FETCHED_ALL: "Notifications fetched sucessfully",
        ID_REQUIRED: "Id is Required",
        UPDATED: "Notifaction updated successfully.",
        DELETED: "Notification deleted successfully",
        INVALID_ID: "Invalid id",
    },
    POINTS: {
        UPDATED: "Points updated successfully",
        FETCHED: "Points fetched successfully",
        INVALID_USER_ID: "Invalid user id",
        INVALID_ID: "Invalid id",
        NO_POINTS_FOUND: "No points found",
        NOT_ENOUGH_POINT: "Sorry, but you don't have enough points to redeem",
        REDEEMED: "Points redeemed successfully",
        REDEEMED_BUT_CREDIT_NOT_UPDATED: "Points redeemed successfully but credits not updated",
        REDEEMED_BUT_USER_NOT_FOUND: "Points redeemed but user not found to update credits",
    },
    REVIEWS: {
        ALREADY_REVIEW: "You are already added review",
        ADDED: "Added to reviews successfully",
        ID_REQUIRED: "id is required",
        FETCHED: "Reviews fetched successfully",
        INVALID_ID: "Invaild Id",
        UNAUTHORIZED: "You are not authorized to perform this operation",
        DELETED: "Reviews deleted successfully",
        UPDATED: "Reviews updated successfully",
        INVALID_CONTRACT_ID: "Invalid contract id",
        CONTRACT_ID_REQUIRED: "Contract Id required",
    },
    REFERRAL: {
        MY_CODE_NOT_FOUND: "This user does't have referral code",
        ALREADY_SENT: "Already referred same email",
        ADDED: "Referred successfully",
        FETCHED: "Referral fetched successfully",
        FETCHED_ALL: "Referrals fetched successfully",
        ALREAD_JOINED: "This user already joined",
        INVALID_ID: "Invaild Id",
        EMAIL_SENT: "Email sent successfully",
        CANNOT_REFER_YOURSELF: "You can't refer to yourself",
    },
    SETTINGS: {
        UPDATED: "Settings updated successfully",
        ID_REQUIRED: "Id Required",
        INVALID_ID: "Invalid Id",
        FETCHED: "Settings fetched successfully",
    },
    CAMPAIGN_RESULT: {
        INVALID_CAMPAIGN_ID: "Invalid campaign id",
        ADDED: "Result added successfully",
        FETCHED_ALL: "Results fetched successfully",
        FETCHED: "Result fetched successfully",
        ID_REQUIRED: "Id required",
        DELETED: "Result deleted successfully",
        INVALID_ID: "Invalid Id",
    },
    DISCOUNT: {
        ADDED: "Discount added successfully",
        UPDATED: "Discount updated successfully",
        INVALID_ID: "Invaild Id",
        FETCHED: "Discount fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Discount deleted successfully",
        FETCHED_ALL: "Discount fetched successfully",
        ALREADY_EXIST: "Same discount already exists"
    },

    CONTENT_MANAGEMENT: {
        ADDED: "Content added successfully",
        ALREADY_EXIST: "Already exists",
        UPDATED: "Content updated successfully",
        FETCHED: "Content fetched sucessfully",
        INVALID_ID: "Invalid id",
        PARAM_MISSING: "Params missing",
        NOT_FOUND: "Content not found",
    },
    AUDIT_TRIAL: {
        ID_REQUIRED: "Id Required",
        FETCHED: "Audit trial fetched sucessfully",
        FETCHED_ALL: "Audit trials fetched sucessfully",
        INVALID_ID: "Invalid id",
    },
    SCRIPT: {
        ADDED: "Script added successfully",
        UPDATED: "Script updated successfully",
        FETCHED: "Script fetched sucessfully",
        ALREADY_EXIST: "Script already exist",
        ID_REQUIRED: "Id Required",
        INVALID_ID: "Invalid id",
        PARAM_MISSING: "Params missing",
        NOT_FOUND: "Content not found",
    },
    BLOG: {
        ALREADY_EXIST: "Same title already exist",
        ADDED: "Blog added sucessfully",
        UPDATED: "Blog updated successfully",
        INVALID_ID: "Invaild Id",
        ID_REQUIRED: "Id is required",
        FETCHED: "Blog fetched successfully",
        DELETED: "Blog deleted successfully",
        ADDED_TRENDING: "Blog added in trending successfully",
        REMOVED_TRENDING: "Blog removed from trending successfully",
        ADDED_PUBLISH: "Blog published successfully",
        REMOVED_PUBLISH: "Blog un-published successfully",
    },
    CAMPAIGN: {
        ADDED: "Campaign added successfully",
        UPDATED: "Campaign updated successfully",
        INVALID_ID: "Invaild Id",
        FETCHED: "Campaign fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Campaign deleted successfully",
        FETCHED_ALL: "Campaign fetched successfully",
        ALREADY_EXIST: "Same Campaign already exists",
        INVALID_CONTRACT_ID: "Invalid contract Id",
        // ALREADY_EXIST: "Campaign already started for this contract",
        CANNOT_ACCEPT: "This campaign already accepted",
        STATUS_UPDATE: "Status updated successfully",
        INVALID_INFLUENCER_ID: "Invaild influencer Id",
    },

    PROPOSAL: {
        SAVED: "Propasal Added successfully.",
        ALREADY_EXIST: "This Propasal already exist",
        UPDATED: "Propasal updated successfully.",
        GET_DATA: "Propasal fetch successfully.",
        ID_REQUIRED: "Id required.",
        INVALID_ID: "Invalid Id.",
        ALL: "All Propasals fetch successfully."
    },

    AFFLIATE_GROUP: {
        SAVED: "Affiliate group added successfully.",
        ALREADY_EXIST: "This group already exist",
        UPDATED: "Group updated successfully.",
        GET_DATA: "Groups fetch successfully.",
        ID_REQUIRED: "Id required.",
        INVALID_ID: "Invalid Id.",
        ALL: "All Groups fetch successfully."
    },

    COMMISSION: {
        CREATED: "Commission added successfully",
        FETCHED: "Commission fetched successfully",
        INVALID_ID: "Invalid id",
        FETCHED_ALL: "Commission fetched sucessfully",
        UPDATED: "Commission updated successfully",
        ALREADY_EXIST: "Commission already exist",
        DELETED: "Commission deleted successfully",
        ID_REQUIRED: "Id is Required",
        INVALID_PLAN: "Invalid plan",
        INVALID_AFFILIATE_GROUP: "Invalid affiliate group",
        INVALID_campaign: "Invalid campaign"

    },

    TRACKING: {
        SAVED: "Click added successfully.",
        ALREADY_EXIST: "Your are already clicked on a link",
        UPDATED: "Group updated successfully.",
        GET_DATA: "Groups fetch successfully.",
        ID_REQUIRED: "Id required.",
        INVALID_ID: "Invalid Id.",
        ALL: "All Groups fetch successfully.",
        LINK: "Link generated successfully"
    },

    PRODUCT: {
        ID_REQUIRED: "Id Required",
        ALREADY_EXIST: 'Offer alreay exist',
        INVALID_ID: "Invalid id",
        NAME_REQUIRED: 'Offer name is required',
        PRICE_REQUIRED: 'Price is required',
        ADDED: 'Offer added successfully',
        DELETED: 'Offer deleted successfully',
        UPDATED: "Offer updated successfully",
        FETCHED_ALL: "Offers fetch successfully",
        ENOUGH_CREDIT_SCORE: "Congratulations! Your credit score is approved",
        NOT_ENOUGH: "Insufficient credit score",
        PRODUCT_REQUEST_ALREADY_EXIST: "We're sorry, but it appears that your request has already been submitted. Duplicate requests are not allowed",
        REQUEST_SENT: "Your request has been sent successfully.Thank you for your submission!",
        REQUEST_ALL: "All request fetch successfully.",
        INVALID_BRAND_PRODUCT: "Invalid brand product",
        INVALID_BRAND: "Invalid brand",
        INVALID_CATEGORY: "Invalid category",
        INVALID_SUB_CATEGORY: "Invalid sub Category"

    },

    MAKE_OFFER: {
        ADDED: "Request sent successfully",
        UPDATED: "Campaign updated successfully",
        INVALID_ID: "Invaild Id",
        FETCHED: "Request fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Campaign deleted successfully",
        FETCHED_ALL: "Request fetched successfully",
        ALREADY_EXIST: "Request already sent to this affiliate.",
        INVALID_CONTRACT_ID: "Invalid contract Id",
        // ALREADY_EXIST: "Campaign already started for this contract",
        CANNOT_ACCEPT: "This request is already accepted",
        STATUS_UPDATE: "Status updated successfully",
        INVALID_INFLUENCER_ID: "Invaild influencer Id",
    },

    INVITE: {
        ALREADY_EXIST: "Invite already sent",
        ADDED: "Invite sent successfully",
        FETCHED: "Invite fetched successfully",
        ID_REQUIRED: "Id is required",
    },

    TRACK_CUSTOMER: {
        ID_REQUIRED: "Id Required",
        SAVED: "Tracking data saved successfully",
        VIEW: "Tracking data fetch successfully",
        INVALID_ID: "Invalid id"
    },

    UNTRACKSALES: {
        INVALID_ID: "Invalid id",
        ALREADY_EXIST: "Already exist",
        ADDED: "untrack sales added successfully",
        FETCHED: "Fetched successfully",
        UPDATED: "untrack sales updated successfully",
        DELETED: "untrack sales deleted successfully",
        CANNOT_ACCEPT: "This request is already accepted",
        STATUS_UPDATE: "Status updated successfully",
    },

    NEWTAX: {
        ALREADY_EXIST: "Tax Details already exist",
        ADDED: "Tax Details added sucessfully",
        INVALID_ID: "Invaild Id",

    },

    AFFILIATEINVITE: {
        INVALID_ID: "Invalid id",
        ALREADY_EXIST: "Already exist",
        ADDED: "affiliate added successfully",
        FETCHED: "Data Fetched successfully",
        UPDATED: "data updated successfully",
        DELETED: "data deleted successfully",
        CANNOT_ACCEPT: "This request is already accepted",
        STATUS_UPDATE: "Status updated successfully",

    },
    COMMON_SUB_CHILD_CATEGORIES: {
        ADDED: "Child Sub Category Added successfully",
        UPDATED: "Child Sub Category Updated successfully",
        INVALID_ID: "Invaild Id",
        FETCHED: "Child Sub Category Fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Child Sub Category Deleted successfully",
        FETCHED_ALL: "All Child Sub Category Fetched successfully",
        ALREADY_EXIST: "Already exists",
    },

    BANNER: {
        ADDED: "Banner Added successfully",
        UPDATED: "Banner Updated successfully",
        INVALID_ID: "Invaild Id",
        FETCHED: "Banner Fetched successfully",
        ID_REQUIRED: "Id is required",
        DELETED: "Banner Deleted successfully",
        FETCHED_ALL: "All Banner Fetched successfully",
        ALREADY_EXIST: "Already exists",
        INVALID_CATEGORY: "Invalid category",

    },
    USERINVITE:{
        USERINVITED:"User invited successfully",
        INVITE_ALREADY_EXISTS:"User invite already exits",
    },
    ACTIVITY_LOGS:{
        FETCHED_ALL:"Fetched successfully"
    },
    AFFILIATE_BRAND_INVITE:{
        REQUEST_SEND:"Request to brand send successfully",
        ALL_FETCHED_SUCCESS:"All records are fetched successfully",
        REQUEST_NOT_FOUND:"Request not found",
        STATUS_UPDATE:"Request status changed"
    }
}
