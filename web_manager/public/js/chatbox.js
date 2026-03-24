'use strict';

function compareChatbox( a, b ) {
    if ( a.time < b.time ){
        return -1;
    }
    else
    if ( a.time > b.time ){
        return 1;
    }
    return 0;
}

function shortDataChatbox(data){
    data= data.sort(compareChatbox);
    var newData=[];
    var acessData =[];
    data.forEach(element => {
        if(element.content.comment_parent_id==0){
            element.content.otherContent =[];
            newData.push(element);
        }
        else
        {
            acessData.push(element);
        }
    });

    acessData.forEach(element => {
        var found = newData.find(o => o.comment_id ==element.comment_parent_id);
        newData[found].content.otherContent.push(element);   
    });

    return newData;
}

function initChatbox()
{
    var chatboxSample =[{ time:1634669318436,content:{comment_id:1634669318436222,post_id:1001,author_id:1000,author_IP:"192",
                                    reply_id:1001,content:"Gastropub cardigan jean shorts, kogi Godard PBR&B lo-fi locavore. Organic chillwave vinyl Neutra. Bushwick Helvetica cred freegan, crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone. ",
                                    coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:0}
                        },
                        { time:1634669318436,content:{comment_id:1634669318436223,post_id:1001,author_id:1001,author_IP:"192",
                                reply_id:1001,content:" Organic chillwave vinyl Neutra. Bushwick Helvetica cred freegan, crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone. ",
                                coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:0}
                        },
                        { time:1634669318436,content:{comment_id:1634669318436224,post_id:1001,author_id:1003,author_IP:"192",
                                reply_id:1001,content:"Bushwick Helvetica cred freegan, crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone. ",
                                coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:1634669318436223}
                        },{ time:1634669318436,content:{comment_id:1634669318436225,post_id:1001,author_id:1002,author_IP:"192",
                                reply_id:1001,content:" crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone. ",
                                coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:0}
                        },
                        { time:1634669318436,content:{comment_id:1634669318436226,post_id:1001,author_id:1002,author_IP:"192",
                                reply_id:1001,content:" Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone. ",
                                coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:1634669318436225}
                        },{ time:1634669318436,content:{comment_id:1634669318436227,post_id:1001,author_id:1001,author_IP:"192",
                                reply_id:1001,content:"Gastropub cardigan jean shorts, ",
                                coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:1634669318436225}
                        }
    ];

    var nesData =shortDataChatbox(chatboxSample);


    return nesData;
}

function informChatboxData(data){
    var html='';
    data.forEach(element => {
        var commentInChat='';
        
        html= html+ `<div class="new_comment">
                                        
        <!-- build comment -->
        <ul class="user_comment">

            <!-- current #{user} avatar -->
            <div class="user_avatar">
                <img src="https://nettacase.com/image/5966ef1fe4a8d670ff09e9e2/thumbnail.jpg"  alt="" >
            </div><!-- the comment body --><div class="comment_body">
                <p>Gastropub cardigan jean shorts, kogi Godard PBR&B lo-fi locavore. Organic chillwave vinyl Neutra. Bushwick Helvetica cred freegan, crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone.</p>
            </div>

            <!-- comments toolbar -->
            <div class="comment_toolbar">

                <!-- inc. date and time -->
                <div class="comment_details">
                    <ul>
                        <li><i class="fa fa-clock-o"></i> 13:94</li>
                        <li><i class="fa fa-calendar"></i> 04/01/2015</li>
                        <li><i class="fa fa-pencil"></i> <span class="user">John Smith</span></li>
                    </ul>
                </div><!-- inc. share/reply and love --><div class="comment_tools">
                    <ul>
                        <li><i class="fa fa-share-alt"></i></li>
                        <li><i class="fa fa-reply"></i></li>
                        <li><i class="fa fa-heart love"></i></li>
                    </ul>
                </div>

            </div>

            <!-- start user replies -->
        <li>
            
            <!-- current #{user} avatar -->
            <div class="user_avatar">
                <img src="https://nettacase.com/image/5966ef1fe4a8d670ff09e9e2/thumbnail.jpg"  alt="" >
            </div><!-- the comment body --><div class="comment_body">
                <p><div class="replied_to"><p><span class="user">John Smith:</span>Gastropub cardigan jean shorts, kogi Godard PBR&B lo-fi locavore. Organic chillwave vinyl Neutra. Bushwick Helvetica cred freegan, crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone.</p></div>That's exactly what I was thinking!</p>
            </div>

            <!-- comments toolbar -->
            <div class="comment_toolbar">

                <!-- inc. date and time -->
                <div class="comment_details">
                    <ul>
                        <li><i class="fa fa-clock-o"></i> 14:52</li>
                        <li><i class="fa fa-calendar"></i> 04/01/2015</li>
                        <li><i class="fa fa-pencil"></i> <span class="user">Andrew Johnson</span></li>
                    </ul>
                </div><!-- inc. share/reply and love --><div class="comment_tools">
                    <ul>
                        <li><i class="fa fa-share-alt"></i></li>
                        <li><i class="fa fa-reply"></i></li>
                        <li><i class="fa fa-heart love"><span class="love_amt"> 4</span></i></li>
                    </ul>
                </div>

            </div>


        </li>

            <!-- start user replies -->
        <li>
            
            <!-- current #{user} avatar -->
            <div class="user_avatar">
                <img src="https://s3.amazonaws.com/uifaces/faces/twitter/ManikRathee/73.jpg"  alt="" >
            </div><!-- the comment body --><div class="comment_body">
                <p><div class="replied_to"><p><span class="user">John Smith:</span>Gastropub cardigan jean shorts, kogi Godard PBR&B lo-fi locavore. Organic chillwave vinyl Neutra. Bushwick Helvetica cred freegan, crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone.</p></div>Finally someone who actually gets it!<div class="replied_to"><p><span class="user">Andrew Johnson:</span>That's exactly what I was thinking!</p></div>That's awesome!</p>
            </div>

            <!-- comments toolbar -->
            <div class="comment_toolbar">

                <!-- inc. date and time -->
                <div class="comment_details">
                    <ul>
                        <li><i class="fa fa-clock-o"></i> 14:59</li>
                        <li><i class="fa fa-calendar"></i> 04/01/2015</li>
                        <li><i class="fa fa-pencil"></i> <span class="user">Simon Gregor</span></li>
                    </ul>
                </div><!-- inc. share/reply and love --><div class="comment_tools">
                    <ul>
                        <li><i class="fa fa-share-alt"></i></li>
                        <li><i class="fa fa-reply"></i></li>
                        <li><i class="fa fa-heart love"><span class="love_amt"> 4039</span></i></li>
                    </ul>
                </div>

            </div>


        </li>

        </ul>

    </div>`;

        if(element.content.comment_parent_id==0){
            element.content.otherContent =[];
            newData.push(element);
        }
        else
        {
            acessData.push(element);
        }
    });

    
}

