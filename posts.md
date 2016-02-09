---
layout: default
---
<div id="header">
<a href="/">Olivia Guest</a> 
</div>

<div class="posts">
  {% for post in site.posts %}
    <article class="post">
      <h1><a href="{{ site.baseurl }}{{ post.url }}">{{ post.title }}</a></h1>
      <div class="entry">
        {{ post.content | truncatewords:50}}
      </div>
      <a href="{{ site.baseurl }}{{ post.url }}" class="read-more">Read More</a>
    </article>
  {% endfor %}
  
 <!-- {% for repository in site.github.public_repositories %}
    * [{{ repository.name }}]({{ repository.html_url }})
  {% endfor %} -->
</div>
