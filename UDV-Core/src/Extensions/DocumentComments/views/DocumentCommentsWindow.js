import { Window } from '../../../Utils/GUI/js/Window';
import '../../../Utils/GUI/css/window.css';
import './DocumentCommentsStyle.css';

export class DocumentCommentsWindow extends Window {

    constructor(documentController, documentCommentsService) {
        super('documentComments', 'Comments');
        this.documentCommentsService = documentCommentsService;
        this.documentController = documentController;

        documentController.documentBrowser.addEventListener(
            Window.EVENT_CREATED, () => {
                let browserTabs = documentController.documentBrowser.browserTabID;
                let docBrowserCreateButton = document.createElement('button');
                docBrowserCreateButton.id = "docBrowserCommentButton";
                let word = document.createTextNode("Comment");
                docBrowserCreateButton.appendChild(word);
                document.getElementById(browserTabs).appendChild(docBrowserCreateButton);
                docBrowserCreateButton.onclick = () => {
                    if (this.isVisible) {
                        this.hide();
                    } else {
                        this.show();
                        this.getComments();
                    }
                };
        });

        documentController.addEventListener(
            Window.EVENT_DISABLED, () => {
                this.disable();
            }
        );
        
        this.appendTo(documentController.parentElement);
        this.hide();
    }

    get innerContentHtml() {
        return `
        <div class="innerClass" id="documentComments_innerWindow">
            <div id ="documentComments_left">

            </div>
            <div id ="documentComments_right">
                <form id="documentComments_inputForm">
                    <div class="commentRow">
                        <textarea placeholder="Enter your comment here." id="documentComments_inputComment" name="description" ></textarea>
                    </div>
                    <div class="commentRow">
                        <button type="button" id ="documentComments_inputButton">Comment</button>
                    </div>
                </form>
            </div>
        </div>
        `;
    }

    getComments() {
        this.documentCommentsService.getComments().then((comments) => {
            document.getElementById('documentComments_left').innerHTML = '';
            for (let comment of comments) {
                let text = (typeof comment.description === 'string') ? comment.description.replace(/(?:\r\n|\r|\n)/g, '<br>') : '';
                let div = document.createElement('div');
                div.className = 'talk-bubble';
                div.innerHTML = `
                    <div class="talktext">
                    <p class="talktext-author">${comment.author.firstName} ${comment.author.lastName}</p>
                    <p class="talktext-comment">${text}</p>
                    <p class="talktext-date">${(new Date(comment.date)).toLocaleString()}</p>
                    </div>
                `;
                document.getElementById('documentComments_left').appendChild(div);
            }
        });
    }

    windowCreated() {
        this.window.style.setProperty('width', '500px');
        this.window.style.setProperty('height', '500px');
        this.window.style.setProperty('left', '290px');
        this.window.style.setProperty('top', '10px');
        this.window.style.setProperty('resize', 'both');
        this.innerContent.style.setProperty('height', '100%');
        document.getElementById('documentComments_inputButton').onclick = this.publishComment.bind(this);
        this.getComments();
    }

    publishComment() {
        let form = document.getElementById('documentComments_inputForm');
        let form_data = new FormData(form);
        this.documentCommentsService.publishComment(form_data).then(() => {
            document.getElementById('documentComments_inputComment').value = '';
            this.getComments();
        });
    }
}