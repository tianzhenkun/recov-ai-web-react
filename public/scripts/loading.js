/**
 * loading 占位
 * 解决首次加载时白屏的问题
 */
(() => {
  const _root = document.querySelector('#root');
  const renderLoadError = (reason) => {
    if (!_root || !_root.querySelector('.resource-loading-placeholder')) return;

    const title = _root.querySelector('.loading-title');
    const subTitle = _root.querySelector('.loading-sub-title');
    const warp = _root.querySelector('.page-loading-warp');

    if (title) title.textContent = '资源加载异常';
    if (subTitle) {
      subTitle.textContent =
        reason || '页面资源加载失败，可能是资源已更新或网络异常，请刷新页面重试。';
    }
    if (warp) {
      warp.innerHTML = `
        <button type="button" class="loading-reload-button">
          刷新页面
        </button>
      `;
      warp
        .querySelector('.loading-reload-button')
        ?.addEventListener('click', reloadWithCacheBust);
    }
  };

  const isResourceError = (event) => {
    const target = event?.target;
    const tagName = target?.tagName?.toLowerCase?.();
    if (tagName === 'script' || tagName === 'link') return true;

    const message = String(event?.message || event?.reason?.message || '');
    return /chunk|dynamically imported module|unexpected token/i.test(message);
  };

  const reloadWithCacheBust = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('_resource_reload', String(Date.now()));
    window.location.replace(url.toString());
  };

  if (_root && _root.innerHTML === '') {
    _root.innerHTML = `
      <style>
        html,
        body,
        #root {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        #root {
          background-repeat: no-repeat;
          background-size: 100% auto;
        }

        .loading-title {
          font-size: 1.1rem;
        }

        .loading-sub-title {
          margin-top: 20px;
          font-size: 1rem;
          color: #888;
        }

        .page-loading-warp {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 26px;
        }
        .ant-spin {
          position: absolute;
          display: none;
          -webkit-box-sizing: border-box;
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          color: rgba(0, 0, 0, 0.65);
          color: #1890ff;
          font-size: 14px;
          font-variant: tabular-nums;
          line-height: 1.5;
          text-align: center;
          list-style: none;
          opacity: 0;
          -webkit-transition: -webkit-transform 0.3s
            cubic-bezier(0.78, 0.14, 0.15, 0.86);
          transition: -webkit-transform 0.3s
            cubic-bezier(0.78, 0.14, 0.15, 0.86);
          transition: transform 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86);
          transition: transform 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
            -webkit-transform 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86);
          -webkit-font-feature-settings: "tnum";
          font-feature-settings: "tnum";
        }

        .ant-spin-spinning {
          position: static;
          display: inline-block;
          opacity: 1;
        }

        .ant-spin-dot {
          position: relative;
          display: inline-block;
          width: 20px;
          height: 20px;
          font-size: 20px;
        }

        .ant-spin-dot-item {
          position: absolute;
          display: block;
          width: 9px;
          height: 9px;
          background-color: #1890ff;
          border-radius: 100%;
          -webkit-transform: scale(0.75);
          -ms-transform: scale(0.75);
          transform: scale(0.75);
          -webkit-transform-origin: 50% 50%;
          -ms-transform-origin: 50% 50%;
          transform-origin: 50% 50%;
          opacity: 0.3;
          -webkit-animation: antspinmove 1s infinite linear alternate;
          animation: antSpinMove 1s infinite linear alternate;
        }

        .ant-spin-dot-item:nth-child(1) {
          top: 0;
          left: 0;
        }

        .ant-spin-dot-item:nth-child(2) {
          top: 0;
          right: 0;
          -webkit-animation-delay: 0.4s;
          animation-delay: 0.4s;
        }

        .ant-spin-dot-item:nth-child(3) {
          right: 0;
          bottom: 0;
          -webkit-animation-delay: 0.8s;
          animation-delay: 0.8s;
        }

        .ant-spin-dot-item:nth-child(4) {
          bottom: 0;
          left: 0;
          -webkit-animation-delay: 1.2s;
          animation-delay: 1.2s;
        }

        .ant-spin-dot-spin {
          -webkit-transform: rotate(45deg);
          -ms-transform: rotate(45deg);
          transform: rotate(45deg);
          -webkit-animation: antrotate 1.2s infinite linear;
          animation: antRotate 1.2s infinite linear;
        }

        .ant-spin-lg .ant-spin-dot {
          width: 32px;
          height: 32px;
          font-size: 32px;
        }

        .ant-spin-lg .ant-spin-dot i {
          width: 14px;
          height: 14px;
        }

        @media all and (-ms-high-contrast: none), (-ms-high-contrast: active) {
          .ant-spin-blur {
            background: #fff;
            opacity: 0.5;
          }
        }

        @-webkit-keyframes antSpinMove {
          to {
            opacity: 1;
          }
        }

        @keyframes antSpinMove {
          to {
            opacity: 1;
          }
        }

        @-webkit-keyframes antRotate {
          to {
            -webkit-transform: rotate(405deg);
            transform: rotate(405deg);
          }
        }

        @keyframes antRotate {
          to {
            -webkit-transform: rotate(405deg);
            transform: rotate(405deg);
          }
        }

        .loading-reload-button {
          height: 40px;
          padding: 0 18px;
          border: 1px solid #1677ff;
          border-radius: 8px;
          color: #fff;
          background: #1677ff;
          box-shadow: 0 2px 0 rgba(5, 145, 255, 0.1);
          cursor: pointer;
          font-size: 14px;
        }

        .loading-reload-button:hover {
          background: #4096ff;
          border-color: #4096ff;
        }
      </style>

      <div class="resource-loading-placeholder" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 362px;
      ">
        <div class="page-loading-warp">
          <div class="ant-spin ant-spin-lg ant-spin-spinning">
            <span class="ant-spin-dot ant-spin-dot-spin">
              <i class="ant-spin-dot-item"></i>
              <i class="ant-spin-dot-item"></i>
              <i class="ant-spin-dot-item"></i>
              <i class="ant-spin-dot-item"></i>
            </span>
          </div>
        </div>
        <div class="loading-title">
          正在加载资源
        </div>
        <div class="loading-sub-title">
          初次加载资源可能需要较多时间 请耐心等待
        </div>
      </div>
    `;

    window.addEventListener(
      'error',
      (event) => {
        if (isResourceError(event)) {
          renderLoadError('页面资源加载失败，请刷新页面重试。');
        }
      },
      true,
    );
    window.addEventListener('unhandledrejection', (event) => {
      if (isResourceError(event)) {
        renderLoadError('页面资源加载失败，请刷新页面重试。');
      }
    });

    window.setTimeout(() => {
      renderLoadError('页面资源加载时间过长，请刷新页面重试。');
    }, 15000);
  }
})();
