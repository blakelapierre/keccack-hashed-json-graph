import R from 'ramda';

import {api, GrammarError} from 'relational_modeler';

const modelText = 
`yours {
  stats {@id, inserted timestamp} {
    user {@userId, name, userAddress, userGravatarid}
      
    post {
      @url text
    } -> user

    post_raw {
      json json
    } -> post

    post_measurement {
      at timestamp,
      amountVoted bigint,
      purchaseAmountSatoshis bigint,
      idHex,
      title,
      userAddress,
      micropaymentsId,
      createdAt timestamp,
      updatedAt timestamp
    } -> post_raw
  }
}`;

const result = api(modelText, 'postgresql'),
      schema = result.schema.join('\n');


import request from 'request';

// getJSONFromPage()
// chain(getJSONFromPage, 2)
// const r = chain([getJSONFromPage, processJSON], 2);
// console.log('r', r);
chain([getJSONFromPage, processJSON.bind(undefined, {})], 2)
  .then(summarize)
  .then(printStats)
  .catch(error => console.error(error));

function chain(fns, upTo = 0) {
  return R.reduce((promise, i) => 
           R.reduce((promise, fn) => promise.then((...args) => fn(i, ...args)), promise)(fns),
         Promise.resolve())(R.range(0, upTo + 1));
}

// function chain(fn, upTo = 0) {
//   return R.reduce((promise, i) => promise.then(() => fn(i)), Promise.resolve(), R.range(0, upTo + 1));
// }

function processJSON(stats, page, obj) {
  let oldest;
  return {
    stats: R.reduce((stats, o) => {
      const {userId, purchaseAmountSatoshis, amountVoted, nComments, userName, userAddress, title, titleUrlString, idHex, updatedAt} = o,
            createdAt = new Date(o.createdAt),
            {current, entries} = (stats[idHex] = stats[idHex] || {current: {}, entries: []});

      entries.push(o);

      Object.assign(current, {userId, purchaseAmountSatoshis, amountVoted, nComments, userName, userAddress, title, titleUrlString, idHex, createdAt, updatedAt});

      if (oldest === undefined || oldest.createdAt > createdAt) oldest = o;

      return stats;
    }, stats)(obj),
    oldest
  };
}

function summarize({stats, oldest}) {
  const users = R.groupBy(({current: {userId, userName}}) => userId)(Object.values(stats));
  
  const summary = R.mapObjIndexed((posts, userId) => {
    const amountVoted = R.sum(R.map(({current: {amountVoted}}) => amountVoted)(posts)),
          nComments = R.sum(R.map(({current: {nComments}}) => nComments || 0)(posts)),
          totalPosts = posts.length;

    return {
      userId,
      userName: posts[0].current.userName,
      amountVoted,
      nComments,
      meanAmountVoted: amountVoted / totalPosts,
      meanNComments: nComments / totalPosts,
      totalPosts
    };
  })(users);

  return {stats, summary, oldest};
}

function printStats({stats, summary, oldest}) {
  const sorted = R.sortBy(R.prop('meanAmountVoted'))(Object.values(summary));
  console.log([
    `Posts: ${Object.keys(stats).length}`,
    `Posters: ${sorted.length}`,
    `Oldest Post: ${oldest.createdAt}`,
    ``
  ].join('\n'));

  console.log(R.chain(({userName, amountVoted, meanAmountVoted, totalPosts}, rank) => [
    `User: ${userName}`, 
    `Amount Voted`,
    `     Total: ${amountVoted}`,
    `      Mean: ${Math.round(meanAmountVoted)}`,
    `# of Posts: ${totalPosts}`
  ].join('\n'))(sorted).join('\n\n'));
}

function getJSONFromPage(page = 0) {
  return new Promise((resolve, reject) => {
    console.log('getting page', page);
    request.get({
      url: `https://www.yours.org/api/contents/page/new/${page}`,
      headers: {
        'Content-type': 'application/json'
      }
    }, (error, response, body) => {
      if (!error) {
        console.log('got page', page);
        try {
          resolve(JSON.parse(body));
        }
        catch (e) {
          reject(e);
        }
      }
      else reject(error);
    });  
  });
}


console.log(schema);