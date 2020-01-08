const WebhooksRouter = require('./webhooks-router');

class GithubService {

  constructor (app,cache) {
    this.router = new WebhooksRouter();
    this.app = app;
    this.cache = cache;
  }

  async onPullRequest (context) {
    try {
      this.router.route(context, (resp) => {
        console.log('router response: ' + JSON.stringify(resp));
        this.updateStatus(context.github, resp);
      }, (err) => {
        console.error(err)
      })
    } catch (e) {
      console.error(e)
    }
  };

  updateStatus (context, msg) {
    msg.statuses.forEach(async element => {
      context.repos.createStatus({
        owner: msg.owner,
        repo: msg.repo,
        sha: msg.sha,
        state: element.status || "pending",
        context: element.name,
        target_url: element.target_url,
        description: element.message
      }).then((result)=>{
        console.log(result);
      }).catch((err)=>{
        console.error(err);
      });

    })
  };

  updateComment (context, msg) {
    return this.commentAction(msg, context.issues.updateComment)
  }

  createComment (context, msg) {
    return this.commentAction(msg, context.issues.createComment)
  }

  content (repoName, path) {
    return new Promise((resolve, reject) => {

      this.app.request('GET /repos/' + repoName + '/contents/' + path)
        .then(res => {
          const buff = Buffer.from(res.data.content, 'base64');
          resolve(buff.toString('ascii'))
        }).catch((err) => {
          reject(err);
        })
    })
  }

  commentAction (msg, action) {
    return new Promise((resolve, reject) => {
      if (msg.path) {
        this.content(msg.owner + '/' + msg.repo, msg.path).then(r => {
          msg.body = r;
          msg.body = this._formatComment(msg);
          resolve(action(msg))
        }).catch((err) => {
          console.error(err);
          reject(err);
        })
      } else if (msg.url) {
        httpClient.get(msg.template_url).then(r => {
          msg.body = r;
          msg.body = this._formatComment(msg);
          resolve(action(msg));
        })
      } else {
        msg.body = this._formatComment(msg);
        resolve(action(msg));
      }
    })
  }

  _formatComment (msg) {
    let body = msg.body;
    Object.entries(msg).forEach((e) => {
      body = body.replace('${' + e[0] + '}', e[1])
    });
    return body
  }

  saveWebhook (msg) {
    return this.router.saveWebhook(msg)
  }

  findWebhook (msg) {
    return this.router.findWebhooks(msg)
  }
}

module.exports = GithubService;
