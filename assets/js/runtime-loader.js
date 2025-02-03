(() => {
    const { createApp, defineAsyncComponent } = Vue
    const { loadModule } = window['vue3-sfc-loader']
    
    const options = {
      moduleCache: {
        vue: Vue
      },
      getFile(url) {
        return fetch(url).then(res => {
          if ( !res.ok ) throw new Error(`Failed to fetch ${url}`)
          return res.text()
        })
      },
      addStyle(textContent) {
        const style = document.createElement('style')
        style.textContent = textContent
        document.head.appendChild(style)
      }
    }
    
    const NetworkComponent = defineAsyncComponent(() =>
        loadModule('./vue/network.vue', options)
      )
      const DashboardComponent = defineAsyncComponent(() =>
        loadModule('./vue/dashboard.vue', options)
      )
    
    const App = {
      components: {
        'network': NetworkComponent,
        'dashboard': DashboardComponent
      },
      template: `
        <div>
          <network></network>
             
        </div>
      `
    }
  
    createApp(App).mount('#app')
  })()
