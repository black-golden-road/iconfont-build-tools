import fg from 'fast-glob';
import { readFileSync } from 'fs';
import { join } from 'path';
import HTML from 'html-parse-stringify';
import { pinyin } from 'pinyin-pro';
import { execSync } from 'child_process';
import axios from 'axios';
import chalk from 'chalk';

export interface GitlabOptions {
    host: string;
    projectId: string;
    projectAccessToken: string;
}

export interface UploadedIconfontInfo {
    iconfontLink: string;
}

export interface Options {
    gitlab: GitlabOptions;
    uploadFn(buf: Buffer): Promise<UploadedIconfontInfo>;
}

export class IconFontTools {
    options: Options;
    private entry = 'icons/**/*.svg';
    constructor(options: Options) {
        this.options = options;
    }
    generateSvgSymbolText = () => {
        const entries = fg.sync(this.entry);
        let text = '';
        for (const entry of entries) {
            const content = readFileSync(join(process.cwd(), entry)).toString();
            const result = HTML.parse(content);
            result[0].attrs = {
                id: pinyin(entry.split('/').slice(1).join('').slice(0, -4), {
                    toneType: 'none',
                    type: 'array',
                    nonZh: 'consecutive',
                }).join('_'),
                viewBox: result[0].attrs.viewBox,
            };
            result[0].name = 'symbol';
            const tmp = HTML.stringify(result).replace(/[\r\n]/g, '');
            text += tmp;
        }
        return text;
    };
    generateIconfontJS = (svgSymbolText: string) => {
        const { gitlab } = this.options;
        return `window._iconfont_svg_string_${gitlab.projectId}='<svg>${svgSymbolText}</svg>',function(l){var a=(a=document.getElementsByTagName("script"))[a.length-1],i=a.getAttribute("data-injectcss"),a=a.getAttribute("data-disable-injectsvg");if(!a){var o,h,t,n,m,c=function(a,i){i.parentNode.insertBefore(a,i)};if(i&&!l.__iconfont__svg__cssinject__){l.__iconfont__svg__cssinject__=!0;try{document.write("<style>.svgfont {display: inline-block;width: 1em;height: 1em;fill: currentColor;vertical-align: -0.1em;font-size:16px;}</style>")}catch(a){console&&console.log(a)}}o=function(){var a,i=document.createElement("div");i.innerHTML=l._iconfont_svg_string_${gitlab.projectId},(i=i.getElementsByTagName("svg")[0])&&(i.setAttribute("aria-hidden","true"),i.style.position="absolute",i.style.width=0,i.style.height=0,i.style.overflow="hidden",i=i,(a=document.body).firstChild?c(i,a.firstChild):a.appendChild(i))},document.addEventListener?~["complete","loaded","interactive"].indexOf(document.readyState)?setTimeout(o,0):(h=function(){document.removeEventListener("DOMContentLoaded",h,!1),o()},document.addEventListener("DOMContentLoaded",h,!1)):document.attachEvent&&(t=o,n=l.document,m=!1,z(),n.onreadystatechange=function(){"complete"==n.readyState&&(n.onreadystatechange=null,e())})}function e(){m||(m=!0,t())}function z(){try{n.documentElement.doScroll("left")}catch(a){return void setTimeout(z,50)}e()}}(window);`;
    };
    generateGitlabRelease = async (iconfontLink: string) => {
        const { gitlab } = this.options;
        const gitHash = execSync('git rev-parse --short=8 HEAD')
            .toString()
            .trim();
        const gitMessage = execSync('git log -1 --pretty=%B').toString().trim();
        await axios.post(
            `${gitlab.host}/api/v4/projects/${gitlab.projectId}/releases`,
            {
                name: gitHash,
                tag_name: gitHash,
                ref: gitHash,
                description: gitMessage,
                assets: {
                    links: [
                        {
                            name: 'iconfontLink',
                            url: iconfontLink,
                            link_type: 'other',
                        },
                    ],
                },
            },
            {
                headers: {
                    'PRIVATE-TOKEN': gitlab.projectAccessToken,
                },
            }
        );
    };
    build = async () => {
        try {
            console.log(chalk.green('生成SVG HTML文本...'));
            const text = this.generateSvgSymbolText();
            console.log(chalk.green('生成SVG HTML文本完成'));
            console.log(chalk.green('生成Iconfont文本...'));
            const iconfont = this.generateIconfontJS(text);
            console.log(chalk.green('生成Iconfont文本完成'));
            const buf = Buffer.from(iconfont, 'utf-8');
            console.log(chalk.green('上传Iconfont...'));
            const { iconfontLink } = await this.options.uploadFn(buf);
            console.log(chalk.green('上传Iconfont完成'));
            console.log(chalk.green('创建Iconfont Release...'));
            await this.generateGitlabRelease(iconfontLink);
            console.log(chalk.green('创建Iconfont Release完成'));
        } catch (e) {
            console.log(chalk.red('构建Iconfont失败', e));
        }
    };
}

export const createOptions = (options: Options) => options;

export { axios };
