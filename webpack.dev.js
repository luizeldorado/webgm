/* eslint-env node, commonjs */

const {mergeWithRules} = require("webpack-merge");

const common = require("./webpack.common.js");

module.exports = mergeWithRules({
	module: {
		rules: {
			test: "match",
			use: "prepend",
		},
	},

})(common, {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.[s]css$/,
				use: [
					"style-loader",
				],
			},
		],
	},
	devServer: {
		static: false,
		hot: false,
		liveReload: false,
		client: {
			overlay: false,
		},
	},
	devtool: "inline-source-map",
});