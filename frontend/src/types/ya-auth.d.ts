declare global {
  interface Window {
    YaAuthSuggest: {
      init: (
        oauthQueryParams: {
          client_id: string;
          response_type: string;
          redirect_uri: string;
        },
        origin: string,
        options: {
          view: string;
          parentId: string;
          buttonView: string;
          buttonTheme: string;
          buttonSize: string;
          buttonBorderRadius: number;
        }
      ) => Promise<{
        handler: () => Promise<{
          access_token: string;
          [key: string]: any;
        }>;
      }>;
    };
  }
}

export {}; 