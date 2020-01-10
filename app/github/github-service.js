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
  async onCheckSuite(context) {
    try {
      this.router.route(context, (resp) => {
        console.log('router response: ' + JSON.stringify(resp));
        this.createCheckRun(context.github, resp);
      }, (err) => {
        console.error(err)
      })
    } catch (e) {
      console.error(e)
    }
  }
  createCheckRun(github, msg) {
    msg.checks.forEach(async check => {
      let run = await github.checks.create({
        owner: msg.owner,
        repo: msg.repo,
        head_sha: msg.sha,
        name: check.name,
        status: check.status,
        output: check.output
      });
      console.log(run);
    });
  }
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

  content (owner,repo, path) {
    return new Promise((resolve, reject) => {
      let ctx = this.cache.get(owner,repo);
      ctx.request('GET /repos/' + owner+ "/" + repo + '/contents/' + path)
        .then(res => {
          resolve(Buffer.from(res.data.content, 'base64').toString('ascii'));
        }).catch((err) => {
          reject(err);
        })
    })
  }

  commentAction (msg, action) {
    return new Promise((resolve, reject) => {
      if (msg.path) {
        this.content(msg.owner ,msg.repo, msg.path).then(r => {
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