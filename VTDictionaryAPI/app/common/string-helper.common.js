/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* ADD NEW PROTOTYPE FUNCTION
/* --------------------------------------------------------------------- */
String.isNullOrEmpty = function (value) {
    return !(typeof value === "string" && value.length > 0);
}

/* --------------------------------------------------------------------- */
/* ESCAPE SPECIAL CHARACTER FROM STRING
/* --------------------------------------------------------------------- */

exports.escapeSpecialCharacters = (inputStr) => {
    return inputStr.replace(/([.*+?=^!:${}()|[\]\/\\])/g, '\\$1');
};