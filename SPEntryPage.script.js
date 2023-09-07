/** 
 *
 *  Service Portal script indicating:
 *  1. Which login page should be used
 *  2. The starting page after the user is authenticated 
 * 
 * Service Portal uses a combination of system properties and script includes to,
 * determine how the system handles URL redirects for users logging in to the portal.
 * 
 * Modify existing sys_properies
    > glide.entry.page.script property
    > Add the value = new SPEntryPage().getLoginURL()
    > active = true

NEW sys_proprties
    > glide.entry.first.page.script
    > value = new SPEntryPage().getFirstPageURL()
    > active  = true
 * 
 **/

var SPEntryPage = Class.create();

SPEntryPage.prototype = {

    initialize: function() {
        this.logVariables = false;
        this.portal = this.getDefaultPortal();
    },

    getDefaultPortal: function() {
        var gr = new GlideRecord("sp_portal");
        gr.addQuery("default", true);
        gr.query();
        if (gr.next())
            return "/" + gr.getValue("url_suffix") + "/";

        return "/esc/";
    },

    getLoginURL: function() {
        var session = gs.getSession();
        var nt = session.getProperty("nav_to");
        var sPage = session.getProperty("starting_page");
        if (nt == "welcome.do")
            session.clearProperty("nav_to");

        if (!sPage && !nt)
            session.putProperty("starting_page", gs.getProperty("glide.login.home"));

        var portalGR = new GlideRecord("sp_portal");
        portalGR.addQuery("url_suffix", this.portal.replace(/\//g, ""));
        portalGR.addNotNullQuery("login_page");
        portalGR.query();
        if (portalGR.next())
            return this.portal + "?id=" + portalGR.login_page.id;

        return this.portal + "?id=login";
    },

    getFirstPageURL: function() {
        var session = gs.getSession();
        this.logProperties('before', session);
        var nt = session.getProperty("nav_to");
        var isServicePortalURL = new GlideSPScriptable().isServicePortalURL(nt);
        var redirectURL = session.getProperty("login_redirect");

        if (user.hasRoles() && !redirectURL && !isServicePortalURL)
            return;

        // **BEGIN MODIFICATION**: Role-based redirection logic
        if (user.hasRole('snc_external')) {
            return "/csm";
        } else if (user.hasRole('snc_internal')) {
            return "/sp";
        }
        // Matt Sutherland
        // **END MODIFICATION**

        if (!redirectURL) {
            var sPage = session.getProperty("starting_page");
            if (sPage && nt == "welcome.do")
                nt = sPage;

            var ep = gs.getProperty("glide.login.home");
            if (nt && ep == nt)
                nt = null;

            if (nt == "welcome.do") {
                session.putProperty("nav_to", ep);
                return;
            }

            session.putProperty("login_redirect", nt || "true");
            return "/login_redirect.do?sysparm_stack=no";
        }

        session.clearProperty("login_redirect");
        session.clearProperty("nav_to");
        var returnUrl = this.portal;
        if (redirectURL && redirectURL != "true") {
            var spUrl = new GlideSPScriptable().mapUrlToSPUrl(redirectURL);
            returnUrl = spUrl ? this.portal + "?" + spUrl : redirectURL;
            if (!user.hasRoles() && !spUrl && redirectURL.indexOf("home_splash.do") > -1)
                returnUrl = this.portal;
        }

        this.logProperties('after', session);
        return returnUrl;
    },

    logProperties: function(beforeOrAfter, session) {
        if (!this.logVariables)
            return;

        gs.log('SPEntryPage: Redirect ------------------------------- ' + beforeOrAfter);
        gs.log('session.starting_page: ' + session.getProperty("starting_page"));
        gs.log('session.nav_to: ' + session.getProperty("nav_to"));
        gs.log('session.login_redirect: ' + session.getProperty("login_redirect"));
        gs.log('gs.fURI: ' + session.getURI());
    },

    type: 'SPEntryPage'
};
