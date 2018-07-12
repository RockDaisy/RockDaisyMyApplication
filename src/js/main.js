(function(){
  var form = window.localStorage.getItem('MY_APP_SAVED_INFO');

  var initAuthHeaders = function(token){
    $.ajaxSetup({
      beforeSend: function (xhr)
      {
        xhr.setRequestHeader('Authorization', token);
      }
    });
  };

  var viewModel = kendo.observable({
    isIframeShown: false,
    form: form ? JSON.parse(form) : {},
    error: '',
    isAuthorized: !!form,
    selectedViewURL: '',
    viewsDS: new kendo.data.DataSource({
      page: 1,
      pageSize: 15,
      transport: {
        read: function (options) {
          if(viewModel.form.domain) {
            $.ajax({
              crossDomain: true,
              url: kendo.format('http://{0}/api/views',viewModel.form.domain),
              type: 'GET'
            }).then(options.success, options.error)
          } else {
            options.success([]);
          }
        }
      }
    }),
    onViewClick: function(ev){
      this.set('selectedViewURL', kendo.format('http://{0}/view/{1}', this.form.domain, $(ev.currentTarget).data('id')));
      this.set('isIframeShown', true);
    },
    onLogOutClick: function(){
      $.ajaxSetup({
        beforeSend: $.noop
      });
      this.set('form', {});
      this.set('isIframeShown', false);
      this.set('isAuthorized', false);
      this.set('selectedViewURL', '');
      window.localStorage.clear();
      this.viewsDS.read();
    },
    onFormSubmit: function(){
      this.set('error', '');
      if($('.main-page__nav-auth form').data('kendoValidator').validate()) {
        var self = this;
        var $spinner = $('.main-page__nav-auth');
        kendo.ui.progress($spinner, true);
        $.ajax({
          url: kendo.format('http://{0}/oauth2/token',this.form.domain),
          type: 'POST',
          crossDomain: true,
          data: $.param({
            grant_type: 'password',
            username: this.form.username,
            password: this.form.password
          })
        }).then(function (data) {
          kendo.ui.progress($spinner, false);
          self.viewsDS.read();
          self.set('isAuthorized', true);
          self.form.token = data.access_token;
          window.localStorage.setItem('MY_APP_SAVED_INFO', JSON.stringify(self.form));
          initAuthHeaders(data.access_token);
        }, function (result) {
          self.set('error', result && result.responseJSON && result.responseJSON.error_description || "Server Error. Please try again later");
          kendo.ui.progress($spinner, false);
        });
      }
    }
  });

  if(viewModel.form.token) {
    initAuthHeaders(viewModel.form.token);
  }

  kendo.bind($('.main-page'), viewModel);
})();
