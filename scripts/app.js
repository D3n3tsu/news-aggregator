/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
APP.Main = (function() {

  var LAZY_LOAD_THRESHOLD = 300;
  var $ = document.querySelector.bind(document);

  var stories = null;
  var storyStart = 0;
  var storiesCount = 100;
  var main = $('main');
  var inDetails = false;
  var storyLoadCount = 0;
  var mainOffsetHeight = main.offsetHeight;
  var mainScrollHeight;
  var storyHeight = 0;
  var mainScrolled;
  var storiesOnScreen = 0;
  var footerHeight = 40;
  var storyElements;
  var header = $('header');
  var headerTitles = header.querySelector('.header__title-wrapper');

  var localeData = {
    data: {
      intl: {
        locales: 'en-US'
      }
    }
  };

  function calculateMainScrolled() {
    mainScrolled = main.scrollTop;
  }

  function onWindowResize() {
    mainOffsetHeight = main.offsetHeight;
    if (storyHeight) {
      setStoriesOnScreen();
    }
  }
  window.addEventListener('resize', onWindowResize);

  var tmplStory = $('#tmpl-story').textContent;
  var tmplStoryDetails = $('#tmpl-story-details').textContent;
  var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
  } else {
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
    tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
  }

  var storyTemplate = Handlebars.compile(tmplStory);
  var storyDetailsTemplate = Handlebars.compile(tmplStoryDetails);
  var storyDetailsCommentTemplate = Handlebars.compile(tmplStoryDetailsComment);
  var emptyConfig = {
    title: '...',
    score: '-',
    by: '...',
    time: 0
  };
  var temlpateHtml = storyTemplate(emptyConfig);

  function applyInitialStylesToTemplate(story, initialStyles) {
    var score = story.querySelector('.story__score');
    var title = story.querySelector('.story__title');
    score.style.backgroundColor = initialStyles.backgroundColor;
    score.style.transform = initialStyles.transform;
    title.style.opacity = initialStyles.opacity;
  }

  function getInitialStyles(story) {
    var score = story.querySelector('.story__score');
    var title = story.querySelector('.story__title');
    return {
      transform: score.style.transform,
      backgroundColor: score.style.backgroundColor,
      opacity: title.style.opacity
    }
  }

  function stylesWereModified(initialStyles) {
    var defaultBackgroundColor = 'rgb(255, 179, 0)';
    return initialStyles.backgroundColor !== defaultBackgroundColor
      && initialStyles.opacity !== 1
      && initialStyles.transform;
  }

  function fillStoryWithDetails(story, details) {
    details.time *= 1000;
    var html = storyTemplate(details);
    story.innerHTML = html;
    story.addEventListener('click', onStoryClick.bind(this, details));
    story.classList.add('clickable');
  }

  function onStoryData (key, details) {
    storyLoadCount = 0;
    if (!key || !details) {
      return;
    }
    var story = document.querySelector('#s-' + key);
    var initialStyles = getInitialStyles(story);
    fillStoryWithDetails(story, details);
    if (stylesWereModified(initialStyles)) {
      applyInitialStylesToTemplate(story, initialStyles);
    }
  }

  function setUrlObject(details) {
    if (details.url) {
      details.urlobj = new URL(details.url);
    }
  }

  function removeOldStoryDetails() {
    var storyDetails = $('.story-details');
    if (storyDetails && storyDetails.parentNode) {
      storyDetails.parentNode.removeChild(storyDetails);
    }
  }

  function ctreateStoryDetails(details) {
    var storyDetails = document.createElement('section');
    setUrlObject(details);
    storyDetails.innerHTML = storyDetailsTemplate(details);
    storyDetails.classList.add('story-details');
    storyDetails.id = 'sd-' + details.id;
    return storyDetails;
  }

  function createComment(commentId) {
    var comment = document.createElement('aside');
    var commentHtml = storyDetailsCommentTemplate({
      by: '', text: 'Loading comment...'
    });
    comment.innerHTML = commentHtml;
    comment.setAttribute('id', 'sdc-' + commentId);
    comment.classList.add('story-details__comment');
    return comment;
  }

  function onCommentDataReceived(commentId, hostElement, commentDetails) {
    if (!commentDetails || commentId !== commentDetails.id) {
      return;
    }
    commentDetails.time *= 1000;
    var comment = hostElement.querySelector('#sdc-' + commentDetails.id);
    comment.innerHTML = storyDetailsCommentTemplate(commentDetails, localeData);
  }

  function loadCommentData(commentId, hostElement) {
    APP.Data.getStoryComment(commentId, onCommentDataReceived.bind(this, commentId, hostElement));
  }

  function loadComments(kids, storyDetails) {
    if (typeof kids === 'undefined') {
      return;
    }
    var commentsElement = storyDetails.querySelector('.js-comments');
    var fragment = document.createDocumentFragment();
    kids.forEach(element => {
      fragment.appendChild(createComment(element));
    });
    commentsElement.appendChild(fragment);
    kids.forEach(element => {
      loadCommentData(element, commentsElement);
    });
  }

  function onStoryClick(details) {
    if (inDetails) {
      return;
    }
    inDetails = true;
    removeOldStoryDetails();
    var storyDetails = ctreateStoryDetails(details);
    document.body.appendChild(storyDetails);    
    showStory(storyDetails);
    setTimeout(loadComments.bind(this, details.kids, storyDetails), 1100);
  }

  function showStory(storyDetails) {
    if (!storyDetails) {
      return;
    }
    document.body.classList.add('details-active');
    var closeButton = storyDetails.querySelector('.js-close');
    closeButton.addEventListener('click', hideStory.bind(this, storyDetails));
    requestAnimationFrame(function() {
      storyDetails.classList.add('opened');
    });
  }

  function deleteStoryDetails() {
    if(storyDetails.parentNode){
      storyDetails.parentNode.removeChild(storyDetails);
    }
  }

  function hideStory(storyDetails) {
    if (!inDetails) {
      return;
    }
    inDetails = false;

    document.body.classList.remove('details-active');
    storyDetails.classList.add('closed');
    storyDetails.classList.remove('opened');
    setTimeout(deleteStoryDetails, 1100);
  }
  
  function colorizeAndScaleStory(scale, saturation, opacity, score, title) {
    score.style.transform = 'scale(' + scale + ')';
    score.style.backgroundColor = 'hsl(42, ' + saturation + '%, 50%)';
    title.style.opacity = opacity;
  }

  function calculateAndColorize(story, scoreLocation) {
    var score = story.querySelector('.story__score');
    var title = story.querySelector('.story__title');
  
    var scale = Math.min(1, 1 - (0.05 * ((scoreLocation - 170) / mainOffsetHeight)));
    var opacity = Math.min(1, 1 - (0.5 * ((scoreLocation - 170) / mainOffsetHeight)));
    var saturation = (100 * (((scale * 40) - 38) / 2));
    
    colorizeAndScaleStory(scale, saturation, opacity, score, title);
  }

  function getStoriesScrolled() {
    var mainScrolledWithHeader = mainScrolled - footerHeight;
    var storiesScrolled = Math.floor(mainScrolledWithHeader / storyHeight);
    if (storiesScrolled < 0) {
      storiesScrolled = 0;
    }
    return storiesScrolled;
  }

  function colorizeAndScaleStories() {
    var storiesScrolled = getStoriesScrolled();
    var reminder = mainScrolled % storyHeight;

    for (var i = storiesScrolled, counter = 1;
        i < storiesScrolled + storiesOnScreen;
        i++, counter++) {
      var story = storyElements[i];
      var scoreLocation = storyHeight * counter + reminder;
      calculateAndColorize(story, scoreLocation);
    }
  }

  function scaleHeaderTitles(scaleString) {
    headerTitles.style.webkitTransform = scaleString;
    headerTitles.style.transform = scaleString;
  }

  function resizeHeader() {
    if (mainScrolled > 70) {
      header.classList.add('raised');
    } else {
      header.classList.remove('raised');
      header.style.height = (156 - mainScrolled) + 'px';
      var scaleString = 'scale(' + (1 - (mainScrolled / 300)) + ')';
      scaleHeaderTitles(scaleString);
    }
  }

  function checkNeedLoadStories() {
    var loadThreshold = mainScrollHeight - mainOffsetHeight - LAZY_LOAD_THRESHOLD;
    if (mainScrolled > loadThreshold) {
      loadStoryBatch();
    }
  }

  function onScroll() {
    calculateMainScrolled();
    resizeHeader();
    checkNeedLoadStories();
    requestAnimationFrame(colorizeAndScaleStories);
  }


  function getCountStoriesToLoad() {
    var loadEnd = storyStart + storiesCount;
    if (loadEnd > stories.length) {
      loadEnd = stories.length;
    }
    return loadEnd;
  }

  function createNewStory(storyData) {
    var key = String(storyData);
    var newStory = document.createElement('div');
    newStory.setAttribute('id', 's-' + key);
    newStory.classList.add('story');
    newStory.innerHTML = temlpateHtml;
    return newStory;
  }

  function createStoriesFragment(loadEnd) {
    var fragment = document.createDocumentFragment();
    for (var i = storyStart; i < loadEnd; i++) {
      fragment.appendChild(createNewStory(stories[i]));
    }
    return fragment;
  }

  function setStoryElements() {
    storyElements = document.querySelectorAll('.story');
  }

  function setMainScrollHeight() {
    mainScrollHeight = main.scrollHeight;
  }
  
  function setStoryHeight() {
    storyHeight = document.querySelector('.story').offsetHeight;
  }

  function setStoriesOnScreen() {
    storiesOnScreen = Math.floor(mainOffsetHeight / storyHeight);
  }

  function setNewStoryStartFromCount() {
    storyStart += storiesCount;
  }

  function updateVariablesForCurrentStoriesCount() {
    storyLoadCount = storiesCount;
    setStoryElements();
    setMainScrollHeight();
    if (!storyHeight) {
      setStoryHeight();
      setStoriesOnScreen();
    }
  }
  function loadNewStoriesDataToCount(loadEnd) {
    for (var i = storyStart; i < loadEnd; i++) {
      var key = String(stories[i]);
      APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
    }
  }

  function addStoriesToMain() {
    var loadEnd = getCountStoriesToLoad();
    main.appendChild(createStoriesFragment(loadEnd));
    loadNewStoriesDataToCount(loadEnd);
  }

  function loadStoryBatch() {
    if (storyLoadCount > 0) {
      return;
    }
    addStoriesToMain();
    updateVariablesForCurrentStoriesCount();
    colorizeAndScaleStories();
    setNewStoryStartFromCount();
  }

  calculateMainScrolled();
  setMainScrollHeight();
  main.addEventListener('scroll', onScroll);
  APP.Data.getTopStories(function(data) {
    main.classList.remove('loading');
    stories = data;
    loadStoryBatch();
  });
})();
