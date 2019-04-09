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
  var count = 100;
  var main = $('main');
  var inDetails = false;
  var storyLoadCount = 0;
  var mainOffsetHeight = main.offsetHeight;
  var mainScrollHeight = main.scrollHeight;
  var storyHeight = 0;
  var mainScrolled = main.scrollTop;
  var storiesOnScreen = 0;
  var footerHeight = 40;
  var storyElements;

  var localeData = {
    data: {
      intl: {
        locales: 'en-US'
      }
    }
  };

  function onWindowResize() {
    mainOffsetHeight = main.offsetHeight;
    if (storyHeight) {
      storiesOnScreen = mainOffsetHeight / storyHeight;
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
    storyElements = document.querySelectorAll('.story');
  }

  function onStoryClick(details) {
    
    if (inDetails) {
      return;
    }
    inDetails = true;
    var storyDetails = $('.story-details');

    if (details.url) {
      details.urlobj = new URL(details.url);
    }

    if(storyDetails && storyDetails.parentNode){
      storyDetails.parentNode.removeChild(storyDetails);
    }
    var commentsElement;
    var storyHeader;
    var storyContent;

    var storyDetailsHtml = storyDetailsTemplate(details);
    var kids = details.kids;
    var commentHtml = storyDetailsCommentTemplate({
      by: '', text: 'Loading comment...'
    });
    
    storyDetails = document.createElement('section');
    storyDetails.classList.add('story-details');
    storyDetails.innerHTML = storyDetailsHtml;
    storyDetails.id = 'sd-' + details.id;

    document.body.appendChild(storyDetails);
    
    commentsElement = storyDetails.querySelector('.js-comments');
    storyHeader = storyDetails.querySelector('.js-header');
    storyContent = storyDetails.querySelector('.js-content');

    var headerHeight = storyHeader.getBoundingClientRect().height;
    storyContent.style.paddingTop = headerHeight + 'px';
    

    if (typeof kids === 'undefined')
      return;
    setTimeout(function(){
      var fragment = document.createDocumentFragment();
      for (var k = 0; k < kids.length; k++) {
        var comment = document.createElement('aside');
        comment.setAttribute('id', 'sdc-' + kids[k]);
        comment.classList.add('story-details__comment');
        comment.innerHTML = commentHtml;
        fragment.appendChild(comment);
        commentsElement.appendChild(fragment);

        // Update the comment with the live data.
        APP.Data.getStoryComment(kids[k], function(commentDetails) {
          if (commentDetails) {
            commentDetails.time *= 1000;
    
            var comment = commentsElement.querySelector(
                '#sdc-' + commentDetails.id);
            comment.innerHTML = storyDetailsCommentTemplate(
                commentDetails,
                localeData);
          }
        });
      }
      commentsElement.appendChild(fragment);
    }, 1100);

    showStory(details.id);
  }

  function showStory(id) {
    var storyDetails = $('#sd-' + id);

    if (!storyDetails)
      return;
    document.body.classList.add('details-active');

    var closeButton = storyDetails.querySelector('.js-close');
    closeButton.addEventListener('click', hideStory.bind(this, id));
    requestAnimationFrame(function() {
      storyDetails.classList.add('opened');
    });
  }

  function hideStory(id) {

    if (!inDetails)
      return;

    var storyDetails = $('#sd-' + id);
    //var maxwidth = document.documentElement.clientWidth;
    //var pixelsPerFrame = maxwidth / 60;
    //var left = 0;

    document.body.classList.remove('details-active');
    storyDetails.classList.add('closed');
    storyDetails.classList.remove('opened');
    //storyDetails.style.transform = 'translateX(' + maxwidth + 'px)';
    //storyDetails.style.opacity = 0;
    inDetails = false;
    setTimeout(function() {
      if(storyDetails.parentNode){
        storyDetails.parentNode.removeChild(storyDetails);
      }

    }, 1100);
/*
    function animate () {
      left += pixelsPerFrame;
      if (left <= maxwidth) {
        var diff = maxwidth - left;
        storyDetails.style.transform = 'translateX(-' + diff + 'px)';
        storyDetails.style.opacity = (diff)/maxwidth;
        requestAnimationFrame(animate);
      } else {
        inDetails = false;
        if(storyDetails.parentNode){
          storyDetails.parentNode.removeChild(storyDetails);
        }
      }
    }
    animate();*/
  }
  
  function colorizeAndScaleStory(scale, saturation, opacity, score, title) {
    score.style.transform = 'scale(' + scale + ')';
    score.style.backgroundColor = 'hsl(42, ' + saturation + '%, 50%)';
    title.style.opacity = opacity;
  }
  function calculateAndColorize(story, scoreLocation) {
    var score = story.querySelector('.story__score');
    var title = story.querySelector('.story__title');
  
    // Base the scale on the y position of the score.
    var scale = Math.min(1, 1 - (0.05 * ((scoreLocation - 170) / mainOffsetHeight)));
    var opacity = Math.min(1, 1 - (0.5 * ((scoreLocation - 170) / mainOffsetHeight)));
    var saturation = (100 * (((scale * 40) - 38) / 2));
    colorizeAndScaleStory(scale, saturation, opacity, score, title);
  }

  function colorizeAndScaleStories() {
    var mainScrolledWithHeader = mainScrolled - footerHeight;
    var storiesScrolled = Math.floor(mainScrolledWithHeader / storyHeight);
    if (storiesScrolled < 0) {
      storiesScrolled = 0;
    }
    var reminder = mainScrolled % storyHeight;

    for (var i = storiesScrolled, counter = 1;
        i < storiesScrolled + storiesOnScreen;
        i++, counter++) {
      var story = storyElements[i];
      var scoreLocation = storyHeight * counter + reminder;
      calculateAndColorize(story, scoreLocation);
    }
  }

  main.addEventListener('scroll', function() {
    mainScrolled = main.scrollTop;

    var header = $('header');
    requestAnimationFrame(colorizeAndScaleStories);

    if (mainScrolled > 70){
      header.classList.add('raised');
    } else {
      header.classList.remove('raised');
      var scrollTopCapped = mainScrolled;
      var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';
      var headerTitles = header.querySelector('.header__title-wrapper');
      headerTitles.style.webkitTransform = scaleString;
      headerTitles.style.transform = scaleString;
      header.style.height = (156 - scrollTopCapped) + 'px';
    }

    // Check if we need to load the next batch of stories.
    var loadThreshold = (mainScrollHeight - mainOffsetHeight - LAZY_LOAD_THRESHOLD);
    if (mainScrolled > loadThreshold)
      loadStoryBatch();
  });

  function loadStoryBatch() {

    if (storyLoadCount > 0)
      return;

    storyLoadCount = count;

    var end = storyStart + count;
    if (end > stories.length) {
      end = stories.length;
    }

    var fragment = document.createDocumentFragment();
    for (var i = storyStart; i < end; i++) {
      var key = String(stories[i]);
      var story = document.createElement('div');
      story.setAttribute('id', 's-' + key);
      story.classList.add('story');
      story.innerHTML = temlpateHtml;
      fragment.appendChild(story);
    }
    main.appendChild(fragment);
    storyElements = document.querySelectorAll('.story');
    mainScrollHeight = main.scrollHeight;
    if(!storyHeight){
      storyHeight = document.querySelector('.story').offsetHeight;
      storiesOnScreen = Math.floor(mainOffsetHeight / storyHeight);
    }
    
      colorizeAndScaleStories();

    for (var i = storyStart; i < end; i++) {
      var key = String(stories[i]);
      APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
    }
    storyStart += count;
  }

  // Bootstrap in the stories.
  APP.Data.getTopStories(function(data) {
    main.classList.remove('loading');
    stories = data;
    loadStoryBatch();
  });
})();
