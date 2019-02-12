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
  var localeData = {
    data: {
      intl: {
        locales: 'en-US'
      }
    }
  };

  var tmplStory = $('#tmpl-story').textContent;
  var tmplStoryDetails = $('#tmpl-story-details').textContent;
  var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
  } else {

    // Remove references to formatRelative, because Intl isn't supported.
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
    tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
  }

  var storyTemplate =
      Handlebars.compile(tmplStory);
  var storyDetailsTemplate =
      Handlebars.compile(tmplStoryDetails);
  var storyDetailsCommentTemplate =
      Handlebars.compile(tmplStoryDetailsComment);

  function onStoryData (key, details) {
    if (!key || !details) {
      return;
    }
    var story = document.querySelector('#s-' + key);

    details.time *= 1000;
    var html = storyTemplate(details);
    requestAnimationFrame(function() {
      story.innerHTML = html;
      story.addEventListener('click', onStoryClick.bind(this, details));
      story.classList.add('clickable');
    });
    requestAnimationFrame(function() {
      colorizeAndScaleStories();
    });
  }

  function onStoryClick(details) {
    
    if (inDetails) {
      return;
    }
    inDetails = true;
    var storyDetails = $('#sd-' + details.id);

    if (details.url) {
      details.urlobj = new URL(details.url);
    }

    if (!storyDetails) {

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
    }

    commentsElement = storyDetails.querySelector('.js-comments');
    storyHeader = storyDetails.querySelector('.js-header');
    storyContent = storyDetails.querySelector('.js-content');

    var headerHeight = storyHeader.getBoundingClientRect().height;
    requestAnimationFrame(function() {
      storyContent.style.paddingTop = headerHeight + 'px';
    });
    
      requestAnimationFrame(showStory.bind(this, details.id));

    if (typeof kids === 'undefined')
      return;

    requestAnimationFrame(function() {
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
    });
  }

  function showStory(id) {
    var storyDetails = $('#sd-' + id);
    var left = null;

    if (!storyDetails)
      return;

    document.body.classList.add('details-active');
    storyDetails.style.opacity = 1;

    function animate () {

      // Find out where it currently is.
      var storyDetailsPosition = storyDetails.getBoundingClientRect();
      var currentLeft = storyDetailsPosition.left;

      // Set the left value if we don't have one already.
      if (left === null)
        left = currentLeft;

      // Now figure out where it needs to go.
      var leftDifference = currentLeft * 0.1;
      if(leftDifference < 5){
        leftDifference *= 1.5;
      }
      left -= leftDifference;

      // Set up the next bit of the animation if there is more to do.
      if (left > 1) {
        requestAnimationFrame(function() {
          storyDetails.style.left = left + 'px';
          animate();
        });
      } else {
        left = 0;
        requestAnimationFrame(function() {
          storyDetails.style.left = '0px';
          var closeButton = storyDetails.querySelector('.js-close');
          closeButton.addEventListener('click', hideStory.bind(this, id));
        });
      }
    }
    requestAnimationFrame(animate);
  }

  function hideStory(id) {

    if (!inDetails)
      return;

    var storyDetails = $('#sd-' + id);
    var left = 0;

    document.body.classList.remove('details-active');

    function animate () {

      // Find out where it currently is.
      var mainPosition = main.getBoundingClientRect();
      var storyDetailsPosition = storyDetails.getBoundingClientRect();
      var target = mainPosition.width + 100;
      var currentLeft = storyDetailsPosition.left;

      // Now figure out where it needs to go.
      var leftDifference = target - currentLeft;
      if (leftDifference > 500){
        left += leftDifference * 0.1;
      } else {
        left += 50;
      }

      // Set up the next bit of the animation if there is more to do.
      if (left - target < 50) {
        requestAnimationFrame(function() {
          storyDetails.style.left = left + 'px';
          storyDetails.style.opacity = (target - left)/target;
          animate();
        });
      } else {
        left = 0;
        inDetails = false;
        if(storyDetails.parentNode){
          storyDetails.parentNode.removeChild(storyDetails);
        }
      }
    }
    requestAnimationFrame(animate);
  }
  
  function colorizeAndScaleStories() {

    var storyElements = document.querySelectorAll('.story');
    var height = main.offsetHeight;
    var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
    var bodyTop = document.body.getBoundingClientRect().top;

    function colorizeAndScaleStory(scoreNewWidthAndHeight, saturation, opacity, score, title){
      requestAnimationFrame(function() {
        score.style.width = scoreNewWidthAndHeight + 'px';
        score.style.height = scoreNewWidthAndHeight + 'px';
        score.style.lineHeight = scoreNewWidthAndHeight + 'px';
        score.style.backgroundColor = 'hsl(42, ' + saturation + '%, 50%)';
        title.style.opacity = opacity;
      });
    }
    // It does seem awfully broad to change all the
    // colors every time!
    for (var s = 0; s < storyElements.length; s++) {

      var story = storyElements[s];
      var score = story.querySelector('.story__score');
      var scoreRect = score.getBoundingClientRect();
      var isInView = (scoreRect.top <= windowHeight) && (scoreRect.bottom >= 0);
      if(isInView) {
        var title = story.querySelector('.story__title');
      
        // Base the scale on the y position of the score.
        var scoreLocation = scoreRect.top - bodyTop;
        var scale = opacity = Math.min(1, 1 - (0.05 * ((scoreLocation - 170) / height)));
        var opacity = scale;
        var scoreNewWidthAndHeight = (scale * 40);
        var saturation = (100 * ((scoreNewWidthAndHeight - 38) / 2));
        colorizeAndScaleStory(scoreNewWidthAndHeight, saturation, opacity, score, title);
      }
    }
  }

  main.addEventListener('scroll', function() {

    var header = $('header');
    requestAnimationFrame(colorizeAndScaleStories);

    // Add a shadow to the header.
    if (main.scrollTop > 70){
      header.classList.add('raised');
    } else {
      header.classList.remove('raised');
      var scrollTopCapped = main.scrollTop;
      var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';
      var headerTitles = header.querySelector('.header__title-wrapper');
      headerTitles.style.webkitTransform = scaleString;
      headerTitles.style.transform = scaleString;
      header.style.height = (156 - scrollTopCapped) + 'px';
    }

    // Check if we need to load the next batch of stories.
    var loadThreshold = (main.scrollHeight - main.offsetHeight -
        LAZY_LOAD_THRESHOLD);
    if (main.scrollTop > loadThreshold)
      loadStoryBatch();
  });

  function loadStoryBatch() {

    if (storyLoadCount > 0)
      return;

    storyLoadCount = count;

    var end = storyStart + count;
    for (var i = storyStart; i < end; i++) {

      if (i >= stories.length)
        return;

      var key = String(stories[i]);
      var story = document.createElement('div');
      story.setAttribute('id', 's-' + key);
      story.classList.add('story');
      story.innerHTML = storyTemplate({
        title: '...',
        score: '-',
        by: '...',
        time: 0
      });
      main.appendChild(story);

      APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
    }

    storyStart += count;

  }

  // Bootstrap in the stories.
  APP.Data.getTopStories(function(data) {
    stories = data;
    loadStoryBatch();
    main.classList.remove('loading');
  });
})();
