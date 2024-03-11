const constants = require('../../config/constants').constants
const response = require('../services/Response');
const Validations = require("../Validations/index");

exports.deleteCommonData = async (req, res) => {
    try {

        let validation_result = await Validations.CommonDeleteValidations.deleteCommonData(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        const { contract_id, type } = req.body;


        if (type == "contract") {
            let get_contract = await Contracts.findOne({ id: contract_id });
            if (!get_contract) {
                throw constants.COMMON_DELETES.INVALID_CONTRACT_ID;
            }

            if (!['completed', 'cancelled_by_brand', 'cancelled_by_influencer'].includes(get_contract.status)) {
                throw constants.COMMON_DELETES.CANT_DELETE_RUNNING_CONTRACT;
            }
        }

        let get_query = {
            user_id: req.identity.id,
            type: type
        }
        if (contract_id) {
            get_query.contract_id = contract_id;
        }


        let get_common_deletes = await CommonDeletes.findOne(get_query);
        if (!get_common_deletes) {
            req.body.user_id = req.identity.id;
            let create_delete = await CommonDeletes.create(req.body).fetch();
            if (create_delete) {
                return response.success(null, constants.COMMON_DELETES.DELETED, req, res);
            }
            throw constants.COMMON.SERVER_ERROR;
        }
        return response.success(null, constants.COMMON_DELETES.DELETED, req, res);
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}