/**
 * @author Smit Luvani
 * @description This file is used to handle chat request
 */

const Axios = require('axios');
const BASE_URL = 'https://api.stackexchange.com/2.3'

const response = (res, status = 500, data = {}) => {
    status = data.status || status;
    res.status(status).json({ status, data });
}

const generateQueryParams = (params) => {
    let query = '?'
    for (let key in params) {
        query += `${key}=${params[key]}&`
    }
    return query
}

// StackAPI
const QueryRoute = {
    advanceSearch: '/search/advanced',
    questionAnswer: '/questions/{id}/answers',
    answer: '/answers/{id}',
}
const defaultQueryParams = {
    page: 1,
    pagesize: 30,
    order: 'desc',
    sort: 'relevance',
    site: 'stackoverflow',
    tagged: 'debugging',
}

/**
 * It call stackoverflow API and return response
 * @param {string} stackRoute API route of stackoverflow
 * @param {*} query query params
 * @returns {Promise}
 */
const stackOverflow = (stackRoute, query) => new Promise((resolve, reject) => {
    Axios.get(`${BASE_URL}${stackRoute}${generateQueryParams(query)}`)
        .then((response) => {
            resolve(response.data)
        })
        .catch((error) => {
            reject(error.response?.data)
        })
})

// Validate input and return pure string
const getQuery = (body) => new Promise((resolve, reject) => {
    const { query } = body;
    if (!query || String(query).trim() === '') {
        return reject({ message: 'query is required' })
    }

    return resolve(String(query).trim());
})

/**
 * It process query and return best answer
 * @param {string} query 
 * @returns {Promise}
 */
const processQuery = (query) => new Promise((resolve, reject) => {
    stackOverflow(QueryRoute.advanceSearch, { ...defaultQueryParams, title: query })
        .then((data) => {
            if (data.items.length !== 0) {
                // find best result
                var bestQuestion = findBestQuestion(query, data.items);

                if (bestQuestion.length === 0) {
                    return reject({ message: 'No result found', status: 404 })
                }

                // get answer of best question
                stackOverflow(QueryRoute.questionAnswer.replace('{id}', bestQuestion[0].question_id), { ...defaultQueryParams, sort: 'votes' })
                    .then((data) => {
                        // find best answer
                        var bestAnswer = findBestAnswer(data.items);
                        if (bestAnswer === 0) return reject({ message: 'No result found', status: 404 })

                        stackOverflow(QueryRoute.answer.replace('{id}', bestAnswer), { ...defaultQueryParams, sort: 'votes', filter: '!xR5eaP-zsOwr)EDJdT' })
                            .then((data) => {
                                if (data.items.length === 0) return reject({ message: 'No result found', status: 404 })
                                return resolve(data.items[0]);
                            }).catch((error) => {
                                return reject(error);
                            })
                    }).catch((error) => {
                        return reject(error);
                    })
            } else {
                return reject({ message: 'No result found', status: 404 })
            }
        })
        .catch((error) => {
            return reject(error);
        })
})

/**
 * It evaluate best question based on tags, title and score
 * @param {string} query 
 * @param {[{tags:[string],owner:object,title:string,score:number}]} data 
 */
const findBestQuestion = (query, data) => {
    // find best result
    var splitQuery = query.split(' ');

    // find best matching tags and title
    var bestQuestion = 0, bestQuestionId = 0;
    data.forEach((item) => {
        let matchingTags = item.tags.filter((tag) => splitQuery.includes(tag))
        let matchingTitle = item.title.split(' ').filter((title) => splitQuery.includes(title))

        var finalScore = (matchingTags.length * 3) + (matchingTitle.length * 2) + (item.score * 1);
        if (finalScore > bestQuestion) {
            bestQuestion = finalScore;
            bestQuestionId = item.question_id;
        }
    })

    return data.filter((item) => item.question_id === bestQuestionId);

}

/**
 * it evaluate best answer based on score and is_accepted
 * @param {[answer_id:number,question_id:number,score:number]} answer
 */
const findBestAnswer = (answer) => {
    if (answer.length === 0) return 0;

    var bestAnswerId = 0;
    var bestAnswerScore = 0;

    var isAcceptedAnswer = answer.find(item => item.is_accepted === true)

    if (!isAcceptedAnswer) {
        answer.forEach((item) => {
            if (item.score > bestAnswerScore) {
                bestAnswerScore = item.score;
                bestAnswerId = item.answer_id;
            }
        })
    } else if (isAcceptedAnswer?.answer_id) {
        return isAcceptedAnswer.answer_id;
    }

    return bestAnswerId || answer[0]?.answer_id;
}

module.exports = function (req, res) {
    getQuery(req.body)
        .then((query) => {
            processQuery(query).then((data) => {
                return response(res, 200, data);
            }).catch(e => {
                return response(res, 400, e.stack || e.message || e)
            })
        })
        .catch((error) => {
            return response(res, 400, error);
        })
};

