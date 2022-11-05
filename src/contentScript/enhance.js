const enhanceMarkAttributeName = "data-translationmark";

const enhanceOriginalDisplayValueAttributeName = "data-translationoriginaldisplay";
const enhanceHtmlTagsInlineIgnore = ['BR', 'CODE', 'KBD', 'WBR'] // and input if type is submit or button, and pre depending on settings
const enhanceHtmlTagsNoTranslate = ['TITLE', 'SCRIPT', 'STYLE', 'TEXTAREA', 'SVG', 'svg'] //TODO verificar porque 'svg' é com letras minúsculas
const blockElements = [
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'OL',  'P', 'TABLE', 'UL'
  ];
const enhancedMap = {
  "twitter.com": function(root){
    // data-testid="tweetText"
    const allNodesNeedToTranslate = []
    const paragraphs = root.querySelectorAll('[data-testid="tweetText"]');
    for (const paragraph of paragraphs) {
      // copy this node after the original node
      if(isValidNode(paragraph)){
       allNodesNeedToTranslate.push(paragraph);
      }
    }
    return allNodesNeedToTranslate;
  }
}

function isValidNode(node){
  if(node.hasAttribute && node.hasAttribute(enhanceMarkAttributeName)){
    return false;
  }
  if(enhanceHtmlTagsInlineIgnore.indexOf(node.nodeName) !== -1 ||
  enhanceHtmlTagsNoTranslate.indexOf(node.nodeName) !== -1 ||
  node.classList.contains("notranslate") ||
  node.getAttribute("translate") === "no" ||
  node.isContentEditable) {
    return false
  }
  // check is there is notranslate class
  return true;
}
function showCopyiedNodes(){
  const copiedNodes = document.querySelectorAll(`[${enhanceMarkAttributeName}="copiedNode"]`);
  for(const node of copiedNodes){
    // @ts-ignore: its ok
    if(node && node.style && node.style.display === "none"){
       // delete display
      const originalDisplay = node.getAttribute(enhanceOriginalDisplayValueAttributeName);
      if(originalDisplay){
        // @ts-ignore: its ok
        node.style.display = originalDisplay;
      } else {
        // delete display
        // @ts-ignore: its ok
        node.style.removeProperty("display");
      }
    }
  }

}
function isBody(el) {
  return document.body === el;
}
function getTitleContainer(root){
  const ele = root.querySelector("h1");
  if(ele){
    return ele;
  }else{
    return null;
  }
}
function getNodesThatNeedToTranslate(root,hostname,options){
  options = options || {};
  let allNodes = [];
  // check sites
  if(enhancedMap[hostname]){
    allNodes= enhancedMap[hostname](root,options);
  }else{

    if(isBody(root)){

      const titleContainer = getTitleContainer(root);
      if(titleContainer){
        allNodes.push(titleContainer);
      }
    }
    const contentContainer = getContainer(root);
    // get all paragraphs
    for(const blockTag of blockElements){
      const paragraphs = contentContainer.querySelectorAll(blockTag.toLowerCase());
      for (const paragraph of paragraphs) {
        if(isValidNode(paragraph)){
          allNodes.push(paragraph);
        }
      }
    }
  }

  for(const node of allNodes){
    // check if there is a copy already
    const previousSibling = node.previousSibling;
    // console.log("previousSibling.hasAttribute(markAttributeName)", previousSibling.hasAttribute(markAttributeName))
    if(!previousSibling || !previousSibling.hasAttribute || !previousSibling.hasAttribute(enhanceMarkAttributeName)){
      const copyNode = node.cloneNode(true);
      copyNode.setAttribute(enhanceMarkAttributeName, "copiedNode");
      // get original display value
      const originalDisplay = node.style.display;
      // add data-translationoriginaldisplay
      if(originalDisplay){
        copyNode.setAttribute(enhanceOriginalDisplayValueAttributeName, originalDisplay);
      }
      // add display none
      copyNode.style.display = "none";
      // add notranslate class
      copyNode.classList.add("notranslate");
      node.parentNode.insertBefore(copyNode, node)
    }
  }
  // copy 
  return allNodes;
}

// get the main container, copy from: https://github.com/ZachSaucier/Just-Read/blob/master/content_script.js

function getContainer(root) {
    let selectedContainer;

        const numWordsOnPage = root.innerText.match(/\S+/g).length;
        let ps = root.querySelectorAll("p");

        // Find the paragraphs with the most words in it
        let pWithMostWords = root,
            highestWordCount = 0;

        if(ps.length === 0) {
            ps = root.querySelectorAll("div");
        }

        ps.forEach(p => {
            if(checkAgainstBlacklist(p, 3) // Make sure it's not in our blacklist
            && p.offsetHeight !== 0) { //  Make sure it's visible on the regular page
                const myInnerText = p.innerText.match(/\S+/g);
                if(myInnerText) {
                    const wordCount = myInnerText.length;
                    if(wordCount > highestWordCount) {
                        highestWordCount = wordCount;
                        pWithMostWords = p;
                    }
                }
            }

        });

        // Keep selecting more generally until over 2/5th of the words on the page have been selected
        selectedContainer = pWithMostWords;
        let wordCountSelected = highestWordCount;

        while(wordCountSelected / numWordsOnPage < 0.4
        && selectedContainer != root
        && selectedContainer.parentElement.innerText) {
            selectedContainer = selectedContainer.parentElement;
            wordCountSelected = selectedContainer.innerText.match(/\S+/g).length;
        }

        // Make sure a single p tag is not selected
        if(selectedContainer.tagName === "P") {
            selectedContainer = selectedContainer.parentElement;
        }

    return selectedContainer;
}

// Check given item against blacklist, return null if in blacklist
const blacklist = ["comment"];
function checkAgainstBlacklist(elem, level) {
    if(elem && elem != null) {
        const className = elem.className,
              id = elem.id;

        const isBlackListed = blacklist.map(item => {
            if((typeof className === "string" && className.indexOf(item) >= 0)
            || (typeof id === "string" && id.indexOf(item) >= 0)
            ) {
                return true;
            }
        }).filter(item => item)[0];

        if(isBlackListed) {
            return null;
        }

        const parent = elem.parentElement;
        if(level > 0 && parent && !parent.isSameNode(document.body)) {
            return checkAgainstBlacklist(parent, --level);
        }
    }

    return elem;
}
