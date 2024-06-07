/**
 * CommonController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const constantObj = sails.config.constants;
const fs = require('fs');
// const sharp = require('sharp');
const safeCred = require('../../config/local');
const response = require('../services/Response');
const constants = require('../../config/constants').constants;
const CSC = require('country-state-city');

generateName = function () {
  // action are perform to generate random name for every file
  var uuid = require('uuid');
  var randomStr = uuid.v4();
  var date = new Date();
  var currentDate = date.valueOf();

  retVal = randomStr + currentDate;
  return retVal;
};
module.exports = {

  uploadImage: async (req, res) => {
    var modelName = req.param('modelName');

    // define folders path
    var rootpath = process.cwd();
    var fullpath = rootpath + "/assets/images/" + modelName;
    var fullpaththumbnail =
      rootpath + "/assets/images/" + modelName + "/thumbnail";
    var fullpath200 =
      rootpath + "/assets/images/" + modelName + "/thumbnail/200";
    var fullpath300 =
      rootpath + "/assets/images/" + modelName + "/thumbnail/300";
    var fullpath500 =
      rootpath + "/assets/images/" + modelName + "/thumbnail/500";

    //Check image upload folder is exists or not. If not create all folders
    if (fs.existsSync(fullpath) == false) {
      fs.mkdirSync(fullpath);
      fs.mkdirSync(fullpaththumbnail);
      fs.mkdirSync(fullpath200);
      fs.mkdirSync(fullpath300);
      fs.mkdirSync(fullpath500);
    }

    try {
      req
        .file('file')
        .upload(
          { maxBytes: 5242880, dirname: '../../assets/images/' + modelName },
          async (err, file) => {
            ////(file)
            if (err) {
              if (err.code == 'E_EXCEEDS_UPLOAD_LIMIT') {
                return res.status(404).json({
                  success: false,
                  error: {
                    code: 404,
                    message: 'Image size must be less than 5 MB',
                  },
                });
              }
            }

            var responseData = {};

            file.forEach(async (element, index) => {

              var name = generateName();
              //(element.fd);
              typeArr = element.type.split('/');
              fileExt = typeArr[1];
              if (fileExt == 'vnd.microsoft.icon') {
                fileExt = 'ico'
              }

              if (
                fileExt === 'jpeg' ||
                fileExt === 'JPEG' ||
                fileExt === 'JPG' ||
                fileExt === 'jpg' ||
                fileExt === 'PNG' ||
                fileExt === 'png' ||
                fileExt === 'ico' ||
                fileExt === 'ICO'
              ) {
                fs.readFile(file[index].fd, async (err, data) => {

                  if (err) {
                    return res.status(403).json({
                      success: false,
                      error: {
                        code: 403,
                        message: err,
                      },
                    });
                  } else {
                    if (data) {
                      var path = file[index].fd;
                      fs.writeFile(
                        'assets/images/' +
                        modelName +
                        '/' +
                        name +
                        '.' +
                        fileExt,
                        data,

                        function (err, image) {
                          if (err) {
                            //(err);
                            return res.status(400).json({
                              success: false,
                              error: {
                                code: 400,
                                message: err,
                              },
                            });

                          }
                        }
                      );
                      fs.writeFile(
                        './.tmp/public/images/' +
                        modelName +
                        '/' +
                        name +
                        '.' +
                        fileExt,
                        data,

                        async function (err, image) {
                          if (err) {
                            //(err);
                            return res.status(400).json({
                              success: false,
                              error: {
                                code: 400,
                                message: err,
                              },
                            });

                          }
                        }
                      );

                      responseData.fullpath = name + '.' + fileExt;
                      responseData.imagePath =
                        'assets/images/' + modelName + '/' + name + '.' + fileExt;
                      // //(responseData ,"responsedata");

                      if (index == file.length - 1) {

                        fs.unlink(file[index].fd, function (err) {
                          if (err) {
                            //(err, "unlink not done")
                          }
                        });

                        await new Promise(resolve => setTimeout(resolve, 6000));

                        return res.json({
                          success: true,
                          code: 200,
                          data: responseData,
                        });
                      }
                    }
                  }
                }); //end of loop
              } else {
                return res.status(404).json({
                  success: false,
                  error: {
                    code: 404,
                    message: constantObj.user.INVALID_FILE_TYPE,
                  },
                });
              }
            });
          }
        );
    } catch (err) {
      console.log(err, "===eerrr");
      return res
        .status(500)
        .json({ success: false, error: { code: 500, message: '' + err } });
    }
  },
  uploadMultipleImage: async (req, res) => {

    var modelName = req.param('modelName');
    var rootpath = process.cwd();
    var fullpath = rootpath + "/assets/images/" + modelName;

    //Check image upload folder is exists or not. If not create all folders
    if (fs.existsSync(fullpath) == false) {
      fs.mkdirSync(fullpath);
    }

    try {
      req
        .file('file')
        .upload(
          { maxBytes: 5242880, dirname: '../../assets/images/' + modelName },
          async (err, file) => {
            ////(file)
            if (err) {
              if (err.code == 'E_EXCEEDS_UPLOAD_LIMIT') {
                return res.status(404).json({
                  success: false,
                  error: {
                    code: 404,
                    message: 'Image size must be less than 5 MB',
                  },
                });
              }
            }

            let fullpath = []
            let resImagePath = []
            let imageRealName = []

            file.forEach(async (element, index) => {
              imageRealName.push(element.filename)
              var name = generateName();

              //(element.fd);
              typeArr = element.type.split('/');
              fileExt = typeArr[1];

              if (
                fileExt === 'jpeg' ||
                fileExt === 'JPEG' ||
                fileExt === 'JPG' ||
                fileExt === 'jpg' ||
                fileExt === 'PNG' ||
                fileExt === 'png'
              ) {
                fs.readFile(file[index].fd, async (err, data) => {
                  if (err) {
                    return res.status(403).json({
                      success: false,
                      error: {
                        code: 403,
                        message: err,
                      },
                    });
                  } else {
                    if (data) {
                      var path = file[index].fd;
                      fs.writeFile(
                        'assets/images/' +
                        modelName +
                        '/' +
                        name +
                        '.' +
                        fileExt,
                        data,

                        function (err, image) {
                          if (err) {
                            //(err);
                            return res.status(400).json({
                              success: false,
                              error: {
                                code: 400,
                                message: err,
                              },
                            });

                          }
                        }
                      );
                      fs.writeFile(
                        './.tmp/public/images/' +
                        modelName +
                        '/' +
                        name +
                        '.' +
                        fileExt,
                        data,

                        async function (err, image) {
                          if (err) {
                            //(err);
                            return res.status(400).json({
                              success: false,
                              error: {
                                code: 400,
                                message: err,
                              },
                            });

                          }
                        }
                      );

                      fullpath.push(name + '.' + fileExt);
                      resImagePath.push('assets/images/' + modelName + '/' + name + '.' + fileExt)

                      // responseData.imagePath =
                      //   'assets/images/' + modelName + '/' + name + '.' + fileExt;
                      // //(responseData ,"responsedata");



                      if (file.length > 0) {

                        fs.unlink(file[index].fd, function (err) {
                          if (err) {
                            //(err, "unlink not done")
                          }
                        });

                        await new Promise(resolve => setTimeout(resolve, 6000));

                        return res.json({
                          "success": true,
                          "code": 200,
                          "data": {
                            "fullPath": resImagePath,
                            "imagePath": fullpath,
                            "imageRealName": imageRealName
                          }
                        });
                      }
                    }
                  }
                }); //end of loop
              } else {
                return res.status(404).json({
                  success: false,
                  error: {
                    code: 404,
                    message: constants.COMMON.NOT_VALID_FILE,
                  },
                });
              }
            });
          }
        );
    } catch (err) {
      //(err);
      return res
        .status(500)
        .json({ success: false, error: { code: 500, message: '' + err } });
    }
  },

  changeStatus: function (req, res) {
    try {
      var modelName = req.param('model');
      var Model = sails.models[modelName];
      var itemId = req.param('id');
      var updated_status = req.param('status');

      let query = {};
      query.id = itemId;

      Model.findOne(query).exec(function (err, data) {
        if (err) {
          return res.json({
            success: false,
            error: {
              code: 400,
              message: "" + err,
            },
          });
        } else {
          Model.update(
            {
              id: itemId,
            },
            {
              status: updated_status,
            },
            function (err, response) {
              if (err) {
                return res.json({
                  success: false,
                  error: {
                    code: 400,
                    message: '' + err,
                  },
                });
              } else {
                return res.json({
                  success: true,
                  code: 200,
                  message: constants.COMMON.STATUS_CHANGED,
                });
              }
            }
          );
        }
      });
    } catch (err) {
      return res
        .status(400)
        .json({ success: false, error: err, message: "" + err });
    }
  },

  commonDelete: async function (req, res) {
    try {
      var modelName = req.param("model");
      var Model = sails.models[modelName];
      var itemId = req.param("id");

      let query = {};
      query.id = itemId;

      Model.findOne(query).exec(async (err, data) => {

        if (err) {
          return res.json({
            success: false,
            error: {
              code: 400,
              message: constantObj.messages.DATABASE_ISSUE,
            },
          });
        } else {
          Model.update(
            {
              id: itemId,
            },
            {

              isDeleted: true,
              // deletedBy: req.identity.id,

              deletedAt: new Date(),
            },

            function (err, response) {
              if (err) {
                return res.json({
                  success: false,
                  error: {
                    code: 400,
                    message: constantObj.messages.DATABASE_ISSUE,
                  },
                });
              } else {
                return res.json({
                  success: true,
                  code: 200,
                  message: "Record deleted successfully.",
                });
              }
            }
          );
        }
      });
    } catch (err) {
      // console.log(err)
      return res
        .status(400)
        .json({ success: false, error: err, message: "Server Error" });
    }
  },

  multipleUploadDocument: function (req, res) {
    try {

      var rootpath = process.cwd();
      var fullpath = rootpath + "/assets/documents/";
      let temp_fullpath = rootpath + "/assets/documents/";

      //Check image upload folder is exists or not. If not create all folders
      if (fs.existsSync(fullpath) == false) {
        fs.mkdirSync(fullpath);
      }
      if (fs.existsSync(temp_fullpath) == false) {
        fs.mkdirSync(temp_fullpath);
      }

      req.file('file').upload({ maxBytes: 50000000, dirname: '../../assets/documents' }, async (err, file) => {
        if (err) {
          if (err.code == 'E_EXCEEDS_UPLOAD_LIMIT') {
            return res.status(404).json({ "success": false, "error": { "code": 404, "message": "Please Select Image Below 30Mb" } });
          }
        }
        let fullpath = []
        let resImagePath = []
        let imageRealName = []

        file.forEach(async (element, index) => {
          imageRealName.push(element.filename)
          var name = generateName()
          typeArr = element.type.split("/");
          fileExt = typeArr[1]
          // console.log(element, '=========element');

          // console.log(fileExt, '=========fileExt');
          let valid_file_extensions = [
            "doc",
            "docx",
            "html",
            "htm",
            "odt",
            "pdf",
            "xls",
            "xlsx",
            "ods",
            "ppt",
            "pptx",
            "txt",
            "vnd.oasis.opendocument.spreadsheet",
            "vnd.oasis.opendocument.text",
            "vnd.openxmlformats-officedocument.wordprocessingml.document",
            "msword",
            "vnd.openxmlformats-officedocument.presentationml.presentation",
            "vnd.ms-powerpoint",
            "plain",
            "vnd.ms-excel"
          ]
          if (!valid_file_extensions.includes(fileExt)) {
            return res.status(404).json({
              success: false,
              error: {
                code: 404,
                message: constants.COMMON.NOT_VALID_FILE,
              },
            });
          }

          // console.log(file[index].fd, '=========file[index].fd');
          fs.readFile(file[index].fd, async (err, data) => {
            if (err) {
              return res.status(403).json({ "success": false, "error": { "code": 403, "message": err }, });
            } else {
              if (data) {
                var path = file[index].fd
                fs.writeFile('assets/documents/' + name + '.' + fileExt, data, function (err, image) {
                  if (err) {
                    // console.log(err, '=========err')
                    return res.status(400).json({ "success": false, "error": { "code": 400, "message": err }, });
                  }
                })

                fs.writeFile(
                  './.tmp/public/documents/' +
                  '/' +
                  name +
                  '.' +
                  fileExt,
                  data,
                  async function (err, image) {
                    if (err) {
                      //(err);
                      return res.status(400).json({
                        success: false,
                        error: {
                          code: 400,
                          message: err,
                        },
                      });

                    }
                  }
                );


                fullpath.push(name + '.' + fileExt)
                resImagePath.push('assets/documents/' + name + '.' + fileExt)
                await new Promise(resolve => setTimeout(resolve, 1000));


                if (index == file.length - 1) {
                  return res.json({
                    "success": true,
                    "code": 200,
                    "data": {
                      "fullPath": resImagePath,
                      "imagePath": fullpath,
                      "imageRealName": imageRealName
                    },
                  });
                }
              }
            }
          });//end of loop
        })
      })
    } catch (err) {
      // console.log(err, '=========err')
      return res.status(500).json({ "success": false, "error": { "code": 500, "message": "" + err } })
    }
  },
  multipleUploadDocumentwithName: function (req, res) {
    try {

      var rootpath = process.cwd();
      var fullpath = rootpath + "/assets/documents/";
      let temp_fullpath = rootpath + "/assets/documents/";

      //Check image upload folder is exists or not. If not create all folders
      if (fs.existsSync(fullpath) == false) {
        fs.mkdirSync(fullpath);
      }
      if (fs.existsSync(temp_fullpath) == false) {
        fs.mkdirSync(temp_fullpath);
      }

      req.file('file').upload({ maxBytes: 50000000, dirname: '../../assets/documents' }, async (err, file) => {
        if (err) {
          if (err.code == 'E_EXCEEDS_UPLOAD_LIMIT') {
            return res.status(404).json({ "success": false, "error": { "code": 404, "message": "Please Select Image Below 30Mb" } });
          }
        }
        let fullpath = []
        let resImagePath = []
        let imageRealName = []
        let allImage = [];
        file.forEach(async (element, index) => {
          //imageRealName.push(element.filename)
          var name = generateName()
          typeArr = element.type.split("/");
          fileExt = typeArr[1]
          // console.log(file[index].fd, '=========file[index].fd');

          let valid_file_extensions = ["doc", "docx", "html", "htm", "odt", "pdf", "xls", "xlsx", "ods", "ppt", "pptx", "txt"]
          if (!valid_file_extensions.includes(fileExt)) {
            return res.status(404).json({
              success: false,
              error: {
                code: 404,
                message: constants.COMMON.NOT_VALID_FILE,
              },
            });
          }

          fs.readFile(file[index].fd, async (err, data) => {
            if (err) {
              return res.status(403).json({ "success": false, "error": { "code": 403, "message": err }, });
            } else {
              if (data) {
                var path = file[index].fd
                fs.writeFile('assets/documents/' + name + '.' + fileExt, data, function (err, image) {
                  if (err) {
                    // console.log(err, '=========err')
                    return res.status(400).json({ "success": false, "error": { "code": 400, "message": err }, });
                  }
                })

                fs.writeFile(
                  './.tmp/public/documents/' +
                  '/' +
                  name +
                  '.' +
                  fileExt,
                  data,
                  async function (err, image) {
                    if (err) {
                      //(err);
                      return res.status(400).json({
                        success: false,
                        error: {
                          code: 400,
                          message: err,
                        },
                      });

                    }
                  }
                );


                // fullpath.push(name + '.' + fileExt)
                // resImagePath.push('assets/documents/' + name + '.' + fileExt)

                var fPath = name + '.' + fileExt;
                var resOath = 'assets/documents/' + name + '.' + fileExt;
                filedata = { name: element.filename, url: fPath };
                allImage.push(filedata);

                await new Promise(resolve => setTimeout(resolve, 1000));

                // "data": {
                //   "fullPath": resImagePath,
                //   "imagePath": fullpath,
                //   "imageRealName": imageRealName
                // },
                if (index == file.length - 1) {
                  return res.json({
                    "success": true,
                    "code": 200,
                    "data": allImage
                  });
                }
              }
            }
          });//end of loop
        })
      })
    } catch (err) {
      // console.log(err, '=========err')
      return res.status(500).json({ "success": false, "error": { "code": 500, "message": "" + err } })
    }
  },
  uploadmodeditorImages: function (req, res) {
    try {
      var rootpath = process.cwd();
      var fullpath = rootpath + "/assets/images/";

      //Check image upload folder is exists or not. If not create all folders
      if (fs.existsSync(fullpath) == false) {
        fs.mkdirSync(fullpath);
      }

      req
        .file("file")
        .upload(
          { dirname: "../../assets/images/" },
          async (err, file) => {
            if (err) {
              // console.log(err, "err 1");
            }

            let fullpath = [];
            let resImagePath = [];
            file.forEach(async (element, index) => {
              typeArr = element.type.split("/");
              fileExt = typeArr[1];
              // fs.chmod(element.fd, 0777);
              var dd = element.fd.split("assets");
              var name = element.filename;
              var filN = dd[1].split("images/");
              //images/modPost/5d168c7a-5bfe-4d20-9a61-77f16bd9edd0.png

              fs.readFile(file[index].fd, async (err, data) => {
                if (err) {
                  return res.status(403).json({
                    success: false,
                    error: { code: 403, message: err },
                  });
                } else {
                  if (data) {
                    var path = file[index].fd;
                    fs.writeFile(
                      ".tmp/public/images/" + filN[1],
                      data,
                      function (err, image) {
                        if (err) {
                          // console.log(err, "======");
                          return res.status(400).json({
                            success: false,
                            error: { code: 400, message: err },
                          });
                        }
                      }
                    );
                  }
                }
              });

              // console.log(dd[1], "index");
              //  console.log(element, "element.fd");
              fullpath.push(dd[1].substring(1));
              resImagePath.push("assets" + dd[1]);
              var fullpathnew = resImagePath[0].replace("assets/", "");
              if (index == file.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                return res.json({
                  status: true,
                  originalName: name,
                  imageUrl: sails.config.BACK_WEB_URL + "" + fullpathnew,
                  location: sails.config.BACK_WEB_URL + "" + fullpathnew,
                  generatedName: fullpath[0],
                  msg: "Image upload successful",
                });
              }
            });
          }
        );
    } catch (err) {
      // console.log(err);
      return res
        .status(500)
        .json({ success: false, error: { code: 500, message: "" + err } });
    }
  },
  uploadSingleDocument: function (req, res) {

    var rootpath = process.cwd();
    var fullpath = rootpath + "/assets/documents/";
    let temp_fullpath = rootpath + "/assets/documents/";


    //Check image upload folder is exists or not. If not create all folders
    if (fs.existsSync(fullpath) == false) {
      fs.mkdirSync(fullpath);
    }
    if (fs.existsSync(temp_fullpath) == false) {
      fs.mkdirSync(temp_fullpath);
    }

    req.file('file').upload({
      maxBytes: 50000000, dirname: require('path').resolve(sails.config.appPath, 'assets/documents')
    }, async function (err, uploadedFiles) {
      if (err) {
        if (err.code == 'E_EXCEEDS_UPLOAD_LIMIT') {
          return res.status(404).json({ "success": false, "error": { "code": 404, "message": "Please Select Image Below 30Mb" } });
        }
      }
      var the_string = uploadedFiles[0].fd;
      let fileExt = uploadedFiles[0].filename.split('.')[1];
      const filename = the_string.split('documents/').pop();

      uploadedFiles.forEach(async (element, index) => {
        // console.log(element,"--ele");
        var name = generateName()
        typeArr = element.fd.split(".");
        fileExt = typeArr.pop()
        let valid_file_extensions = ["doc", "docx", "html", "htm", "odt", "pdf", "xls", "xlsx", "ods", "ppt", "pptx", "txt","csv"]
        if (!valid_file_extensions.includes(fileExt)) {
          return res.status(404).json({
            success: false,
            error: {
              code: 404,
              message: constants.COMMON.NOT_VALID_FILE,
            },
          });
        }

        fs.readFile(uploadedFiles[index].fd, async (err, data) => {
          if (err) {
            return res.status(403).json({ "success": false, "error": { "code": 403, "message": err }, });
          } else {
            if (data) {
              var path = uploadedFiles[index].fd
              fs.writeFile('assets/documents/' + name + '.' + fileExt, data, function (err, image) {
                if (err) {
                  return res.status(400).json({ "success": false, "error": { "code": 400, "message": err }, });
                }
              })

              fs.writeFile(
                './.tmp/public/documents/' +
                '/' +
                name +
                '.' +
                fileExt,
                data,
                async function (err, image) {
                  if (err) {
                    console.log(err);
                    return res.status(400).json({
                      success: false,
                      error: {
                        code: 400,
                        message: err,
                      },
                    });
                  }
                }
              );
              await new Promise(resolve => setTimeout(resolve, 1000));
              return res.status(200).json({
                success: true,
                code: 200,
                data: {
                  fullPath: uploadedFiles[0].fd,
                  filename: uploadedFiles[0].filename,
                  imagePath: filename,
                }
              });
            }
          }
        });//end of loop
      })
    });
  },
  deleteImage: async (req, res) => {
    try {
      let Imagename = req.param('Imagename')
      modelName = req.param('modelName')
      let fs = require('fs');
      await fs.unlinkSync("assets/images/" + modelName + "/" + Imagename);

      return res.status(200).json({
        code: 200,
        success: true,
        message: "Image Deleted Successfully."
      })
    } catch (err) {
      // // console.log(err);
      return res.status(400).json({ success: false, error: { "code": 400, "message": "" + err } });
    }
  },//end removeImage's ()
  deleteMultipleImages: (req, res) => {
    try {
      let fs = require('fs');
      modelName = req.param('modelName')
      let Imagenames = req.param('Imagenames')

      for (let index = 0; index < Imagenames.length; index++) {
        const Imagename = Imagenames[index];
        fs.unlink('assets/images/' + modelName + '/' + Imagename, function (err) {
          if (err) throw err;
        });
      }

      return res.status(200).json({
        code: 200,
        success: true,
        message: constantObj.common.IMAGE_DELETE
      })
    } catch (err) {
      // // console.log(err);
      return res.status(400).json({ success: false, error: { "code": 400, "message": "" + err } });
    }
  },//end deleteMultiImage function
  deleteDocument: async (req, res) => {
    try {
      let fileName = req.param('fileName')
      let fs = require('fs');

      await fs.unlinkSync("assets/documents/" + fileName);


      // fs.unlink('assets/documents/' + fileName, function (err) {
      //   if (err) throw err;

      return res.status(200).json({
        code: 200,
        success: true,
        message: "Documets Deleted Successfully."
      })
      // });
    } catch (err) {
      // // console.log(err);
      return res.status(400).json({ success: false, error: { "code": 400, "message": "" + err } });
    }
  },//end deleteDocument's ()

  uploadMultipleVideos: async (req, res) => {
    try {
      var modelName = req.param('modelName');

      if (!modelName || typeof modelName == undefined) {
        return res.status(404).json({
          success: false,
          error: { code: 404, message: "Please Add Model Name" },
        });
      }

      var rootpath = process.cwd();
      var fullpath = rootpath + "/assets/" + modelName;

      //Check image upload folder is exists or not. If not create all folders
      if (fs.existsSync(fullpath) == false) {
        fs.mkdirSync(fullpath);
      }

      req
        .file("file")
        .upload(
          { maxBytes: 10485760000, dirname: "../../assets" },
          async (err, file) => {
            if (err) {
              if (err.code == "E_EXCEEDS_UPLOAD_LIMIT") {
                return res.status(404).json({
                  success: false,
                  error: {
                    code: 404,
                    message: "Please Select video Below 100Mb",
                  },
                });
              }
            }

            if (file.length > 20) {
              return res.status(404).json({
                success: false,
                error: {
                  code: 404,
                  message: "Please upload maximum 20 videos.",
                },
              });
            }

            let fullpath = [];
            let resImagePath = [];
            let imageRealName = []
            file.forEach(async (element, index) => {
              imageRealName.push(element.filename)
              var name = generateName();
              typeArr = element.type.split("/");
              fileExt = typeArr[1];

              let valid_file_extensions = ["mp4", "webm", "mkv", "mov", "wmv", "avi", "flv"]
              if (valid_file_extensions.includes(fileExt)) {
                fs.readFile(file[index].fd, async (err, data) => {
                  if (err) {
                    return res.status(403).json({
                      success: false,
                      error: { code: 403, message: err },
                    });
                  } else {
                    if (data) {
                      var path = file[index].fd;
                      // fs.writeFile(
                      //   ".tmp/public/" +
                      //   modelName +
                      //   "/" +
                      //   name +
                      //   "." +
                      //   fileExt,
                      //   data,
                      //   function (err, image) {
                      //     if (err) {
                      //       console.log(err),'======err';
                      //       return res.status(400).json({
                      //         success: false,
                      //         error: { code: 400, message: err },
                      //       });
                      //     }
                      //   }
                      // );
                      fs.writeFile(
                        "assets/" +
                        modelName +
                        "/" +
                        name +
                        "." +
                        fileExt,
                        data,
                        function (err, image) {
                          if (err) {
                            return res.status(400).json({
                              success: false,
                              error: { code: 400, message: err },
                            });
                          }
                        }
                      );

                      fullpath.push(name + "." + fileExt);
                      resImagePath.push("assets/" + modelName + "/" + name + "." + fileExt);

                      if (file.length > 0) {
                        fs.unlink(file[index].fd, function (err) {
                          if (err) {
                            //(err, "unlink not done")
                          }
                        });
                        await new Promise(resolve => setTimeout(resolve, 6000));

                        return res.json({
                          "success": true,
                          "code": 200,
                          "data": {
                            "fullPath": resImagePath,
                            "videoPath": fullpath,
                            "videoRealName": imageRealName
                          }
                        });
                      }

                    }
                  }
                }); //end of loop
              } else {
                return res.status(404).json({
                  success: false,
                  error: {
                    code: 400,
                    message: constantObj.COMMON.NOT_VALID_FILE,
                  },
                });
              }
            });
          }
        );
    } catch (err) {
      // console.log(err, '==========err11');
      return res
        .status(500)
        .json({ success: false, error: { code: 500, message: "" + err } });
    }
  },
  deleteVideo: async (req, res) => {
    let videoName = req.param("videoName");
    let modelName = req.param("modelName");
    if (!videoName || typeof videoName == undefined) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: "Video Name is required" },
      });
    }

    // await fs.unlinkSync(".tmp/public/images/" + modelName + "/" + videoName);
    // fs.unlink(".tmp/public/" + modelName + "/" + videoName, function (err) {
    //   if (err) throw err;
    // });
    fs.unlink("assets/" + modelName + "/" + videoName, function (err) {
      if (err) throw err;
    });
    return res.status(200).json({
      code: 200,
      success: true,
      message: "Video Deleted Successfully.",
    });
  },
};







