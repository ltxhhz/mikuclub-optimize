// ==UserScript==
// @name         初音社网页体验优化
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  目前提供屏蔽up主和界面优化功能
// @author       ltxhhz
// @include      /^https:\/\/www\.mikuclub\.\w+\/\d*/
// @match        https://www.mikuclub.win/*
// @match        https://www.mikuclub.*/*
// @icon         https://cdn.mikuclub.fun/favicon.ico
// @require      https://unpkg.com/sweetalert2@11.7.12/dist/sweetalert2.min.js
// @resource     swalcss https://unpkg.com/sweetalert2@11.7.12/dist/sweetalert2.min.css
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_getResourceText
// ==/UserScript==

;(function () {
  'use strict'
  GM_addStyle(`
        .right-link:hover{
            background-color:rgba(169,169,169,.3);
        }
        .s-to-show{
            visibility: hidden;
        }
        .s-to-hover:hover .s-to-show{
            visibility: visible;
        }
        .s-mark{
            position:relative;
            overflow:hidden;
        }
        .s-mark::before{
            content: "";
            width: 100px;
            height: 100px;
            position: absolute;
            transform: rotate(45deg);
            right: -50px;
            top: -50px;
            opacity: .5;
            background-color: red;
        }
    `)
  GM_addStyle(GM_getResourceText('swalcss'))
  const Toast = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    icon: 'info',
    timer: 2000,
    timerProgressBar: true,
    didOpen: toast => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  })

  function article() {
    //内容页功能
    let div = document.createElement('div')
    let funcPart = document.querySelector('div.functional-part')
    if (!funcPart) return
    funcPart.style.position = 'sticky'
    funcPart.style.top = '80vh'

    function getHeight() {
      let toolbar = document.querySelector('div.functional-part > div:first-child')
      div.style.height = toolbar.clientHeight + 20 + 'px'
    }
    getHeight()
    window.addEventListener('resize', getHeight)
    document.querySelector('.article-content').append(div)
    //点击右半边在新标签页打开
    Array.from(document.querySelectorAll('.list-body a')).forEach(e => {
      let r = document.createElement('div')
      r.className = 'right-link'
      r.style.cssText = `position: absolute;
          top: 0;
          right: 0;
          width: 50%;
          bottom: 0;
          z-index: 2;`
      r.onclick = e1 => {
        e1.stopPropagation()
        e1.preventDefault()
        open(e.href)
        return false
      }
      e.append(r)
    })
  }
  article()

  function addBL(obj) {
    const o = GM_getValue('blacklist', {})
    o[obj.sign] = obj
    GM_setValue('blacklist', o)
  }

  function filterList(el) {
    let sum = 0
    const o = Object.keys(GM_getValue('blacklist', {})),
      type = GM_getValue('hideType', 0)
    if (el) {
      if (el.nodeType == document.TEXT_NODE) return
      const a = el.querySelector('.col .card .row .text-1-rows .card-link')
      const arr = a.href.split('/')
      const sign = arr[arr.length - 1]
      if (o.includes(sign)) {
        if (type == 0) {
          el.querySelector('.card-img-container').classList.add('s-mark')
        } else {
          el.remove()
        }
      }
      return
    } else {
      const postListEl = document.querySelector('.post-list')
      for (let i = 0; i < postListEl.children.length; ) {
        const e = postListEl.children.item(i)
        const a = e.querySelector('.col .card .row .text-1-rows .card-link')
        const arr = a.href.split('/')
        const sign = arr[arr.length - 1]
        if (o.includes(sign)) {
          sum++
          if (type == 0) {
            e.querySelector('.card-link').classList.add('s-mark')
          } else {
            e.remove()
            continue
          }
        }
        i++
      }
    }
    Toast.fire({
      title: `过滤${sum}个投稿`
    })
    if (sum > 10) {
      //nextPage()
    }
  }

  let sum = 0

  function filterList1() {
    const arr = Object.keys(GM_getValue('blacklist', {})),
      type = GM_getValue('hideType', 1)
    return el => {
      if (arr.includes(el.post_author.user_login.toLowerCase())) {
        sum++
        return type == 0 ? el.toHTML().replaceAll('card-img-container', 'card-img-container s-mark') : ''
      }
      return el.toHTML()
    }
  }

  function addHideBtn(e) {
    if (e.nodeType == document.TEXT_NODE) return
    const avatar = e.querySelector('.col .card .row .col-auto .avatar')
    const a = e.querySelector('.col .card .row .text-1-rows .card-link')
    const arr = a.href.split('/')
    const sign = arr[arr.length - 1]
    a.parentElement.classList.add('s-to-hover')
    a.parentElement.append(
      (() => {
        const aa = document.createElement('a')
        aa.innerHTML = '<i class="fa fa-eye-slash"></i>'
        aa.classList.add('s-to-show')
        aa.href = 'javascript:;'
        aa.title = '隐藏此用户'
        aa.onclick = () => {
          addBL({
            sign,
            homepage: a.href,
            name: a.textContent.trim(),
            avatar: avatar.src
          })
          Toast.fire({
            title: '添加成功',
            icon: 'success'
          })
          filterList()
        }
        return aa
      })()
    )
  }

  function articleList() {
    //内容列表
    const postListEl = document.querySelector('.post-list')
    if (!postListEl) return null
    if (/(?:https?:\/\/)?www\.mikuclub\.\w+\/author\/.*/.test(location.href)) return null
    filterList()
    const observer = new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            // filterList(node)
            addHideBtn(node)
          }
        }
      }
    })
    observer.observe(postListEl, {
      childList: true
    })
    for (let i = 0; i < postListEl.children.length; i++) {
      const e = postListEl.children.item(i)
      addHideBtn(e)
    }
    MyPostSlimList.prototype.toHTML = function () {
      let output = ''
      if (this.length) {
        const filter = filterList1()
        //循环累积输出所有文章
        output = this.reduce((previousOutput, currentElement) => {
          previousOutput += filter(currentElement)
          return previousOutput
        }, '')
        Toast.fire({
          title: `过滤${sum}个投稿`
        })
        if (sum > 10) {
          //nextPage()
        }
        sum = 0
      }
      return output
    }
  }

  function nextPage() {
    console.log('下一页')
    setTimeout(() => {
      document.querySelector('.get-next-page').click()
    }, 1e3)
  }
  if (articleList() === null) {
    console.log('不过滤')
  } else {
    console.log('过滤')
  }

  GM_registerMenuCommand('⚙️ 设置', () => {
    const settingHtml = `
            <div style="font-size: 1em;width:400px;">
                <fieldset>
                    <legend>黑名单</legend>
                    <div style="display: flex;align-items:center;justify-content: space-between;">
                        隐藏方式：
                        <label>
                        标记
                        <input type="radio" name="hide-type" id="" value="0" ${GM_getValue('hideType', 1) == 0 ? 'checked' : ''}>
                        </label>
                        <label>
                        隐藏
                        <input type="radio" name="hide-type" id="" value="1" ${GM_getValue('hideType', 1) == 1 ? 'checked' : ''}>
                        </label>
                    </div>
                    <hr>
                    <div>列表</div>
                    <div style="max-height: 200px;overflow-y: scroll;" id="S-List">

                    </div>
                </fieldset>
            </div>`
    const tmp = document.createElement('div')
    tmp.innerHTML = settingHtml
    Array.from(tmp.querySelectorAll('[name="hide-type"]')).forEach(e => {
      e.onclick = () => {
        GM_setValue('hideType', e.value)
      }
    })
    const items = Object.values(GM_getValue('blacklist', [])).map(e => {
      const div = document.createElement('div')
      div.style.display = 'flex'
      div.style.height = '40px'
      div.style.alignItems = 'center'
      div.innerHTML = `
            <img src="${e.avatar}" alt="avatar" height="100%">
            <div style="flex:1;padding:0 10px 0">${e.name}</div>
            <a href="${e.homepage}" target="_blank" rel="noopener noreferrer">主页</a>
            <div style="padding:0 5px 0;">|</div>
        `
      const a = document.createElement('a')
      a.href = 'javascript:;'
      a.innerText = '删除'
      a.onclick = function () {
        const obj = GM_getValue('blacklist')
        delete obj[e.sign]
        GM_setValue('blacklist', obj)
        Toast.fire({
          title: '删除成功',
          icon: 'success'
        })
        div.remove()
      }
      div.append(a)
      return div
    })
    tmp.querySelector('#S-List').append(...(items.length ? items : ['空']))
    tmp.firstElementChild.onsubmit = function (e) {
      console.log(e)
    }
    Swal.fire({
      title: '优化工具配置',
      html: tmp.firstElementChild,
      icon: 'info',
      showCloseButton: true,
      confirmButtonText: '关闭',
      customClass: {
        container: 'panai-container',
        popup: 'panai-popup'
      }
    })
  })
})()
