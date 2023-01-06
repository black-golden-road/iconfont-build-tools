const { createOptions, axios } = require('iconfont-tools');
const FormData = require('form-data');

module.exports = createOptions({
    gitlab: {
        /**
         * gitlab地址
         */
        host: 'https://gitlab',
        /**
         * gitlab项目ID
         */
        projectId: '12345',
        /**
         * gitlab项目access token，需要api权限
         */
        projectAccessToken: '',
    },
    uploadFn: async (buf) => {
        /**
         * 此处需自行实现上传文件至CDN
         */
        const formdata = new FormData();
        formdata.append('file', buf, 'iconfont.js');
        const result = await axios({
            url: 'uploadUrl',
            method: 'POST',
            data: formdata,
            headers: {
                ...formdata.getHeaders(),
            },
            maxContentLength: Infinity,
        });
        return {
            iconfontLink: result.data.iconfontLink,
        };
    },
});
