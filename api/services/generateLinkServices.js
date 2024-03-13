

exports.generateLink = async (inputs) => {
    let { baseUrl, parameters } = inputs;
    const parsedUrl = new URL(baseUrl);
    await Object.keys(parameters).forEach(key => {
        parsedUrl.searchParams.append(key, parameters[key]);
    });
    return parsedUrl.toString();
}
